"use strict";
const { net } = require('electron');
const { performance } = require('perf_hooks');

class TunaNowPlayingPlugin {
    #lastTimeUpdate;

    constructor() {
        /*
         * Base Plugin Details
         */
        this.name = "Tuna Now Playing Updater";
        this.description = "Makes the currently playing Song information available to Tuna";
        this.version = "0.1.0";
        this.author = "ePirat";

        this.#lastTimeUpdate = performance.now();
    }

    /**
     * Returns a Tuna-compatible Now Playing Information
     * object from the given Cider Now Playing attributes.
     * @param attributes Music Attributes
     */
    static #attributesToTunaInfo(attributes) {
        if (!attributes || !attributes.name) {
            return {
                'status' : 'unknown',
            };
        }

        let coverInfo = {}
        if (attributes.artwork?.url) {
            let coverUrl = attributes.artwork.url.replace('{h}', attributes.artwork.height).replace('{w}', attributes.artwork.width);
            coverInfo = { 'cover_url' : coverUrl };
        }
        return {
            'status' : (attributes.status) ? 'playing' : 'stopped',
            'title'  : attributes.name,
            'album'  : attributes.albumName,
            'artists': [ attributes.artistName ],
            'album_artist': attributes.primaryArtist,
            'duration' : Math.floor(attributes.durationInMillis),
            'progress' : Math.floor(attributes.currentPlaybackTime) * 1000,
            ...coverInfo
        }
        //console.log(attributes);
    }

    /**
     * Update Tuna with the given Cider Now Playing attributes
     * @param attributes Music Attributes
     */
    #updateTuna(attributes) {
        // Get Tuna object
        let data = TunaNowPlayingPlugin.#attributesToTunaInfo(attributes);
        console.log('Sending data', data);

        const request = net.request({
            method: 'POST',
            url: 'http://localhost:1608/',
        });
        request.on('response', (response) => {
            if (response.statusCode !== 200) {
                console.error(`[TunaNowPlaying] Tuna rejected status update, HTTP status: ${response.statusCode}`);
                return;
            }
            console.log(`[TunaNowPlaying] Successfully updated Tuna Now Playing info`);
        });
        request.on('error', (error) => {
            console.error(`[TunaNowPlaying] Unable to contact Tuna API: ${JSON.stringify(error)}`);
        });
        request.end(JSON.stringify({ 'data' : data, 'date' : Date.now() }));
    }

    /**
     * Runs on app ready
     */
    onReady(win) {
        console.log("[TunaNowPlaying] Ready");
    }

    /**
     * Runs on app stop
     */
    onBeforeQuit() {
        console.log("[TunaNowPlaying] Terminating");
    }

    /**
     * Runs on playback State Change
     * @param attributes Music Attributes
     */
    onPlaybackStateDidChange(attributes) {
        this.#updateTuna(attributes);
    }

    /**
     * Runs on song change
     * @param attributes Music Attributes
     */
    onNowPlayingItemDidChange(attributes) {
        this.#updateTuna(attributes);
    }

    /**
     * Runs on playback time change
     * @param attributes Music Attributes
     */
    playbackTimeDidChange(attributes) {
        const monotonicNow = performance.now();
        if (monotonicNow - this.#lastTimeUpdate < 2500) {
            return;
        }

        this.#updateTuna(attributes);
        this.#lastTimeUpdate = performance.now();
    }
}

module.exports = TunaNowPlayingPlugin;
