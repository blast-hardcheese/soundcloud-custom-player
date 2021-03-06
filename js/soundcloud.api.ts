/// <reference path="../../js/definitions/jquery/jquery.d.ts" />
/// <reference path="../../js/definitions/rx.js/rx.all.ts" />

interface APIOptions {
    apiKey: string;
    useSandBox?: boolean;
}

interface Link {
    url: string;
    title?: string;
}

interface Product {
    id: string;
    name: string;
}

interface Subscription {
    product: Product;
}

interface SoundCloudEntity {
    id: number;
    description?: string;
    kind: string;
    permalink_url: string;
    permalink: string;
    uri: string;
}

interface User extends SoundCloudEntity {
    avatar_url: string;
    city?: string;
    country?: string;
    discogs_name?: string;
    first_name?: string;
    followers_count: number;
    followings_count: number;
    full_name?: string;
    last_name?: string;
    myspace_name?: string;
    online?: boolean;
    plan?: string;
    playlist_count: number;
    public_favorites_count: number;
    subscriptions?: Subscription[];
    track_count?: number;
    username: string;
    website?: string;
    website_title?: string;
}

interface Track extends SoundCloudEntity {
    artwork_url: string;
    attachments_uri: string;
    bpm?: number;
    comment_count: number;
    commentable: boolean;
    created_at: string;
    download_count: number;
    download_url: string;
    downloadable: boolean;
    duration: number;
    embeddable_by: string;
    favoritings_count: number;
    genre: string;
    isrc: string;
    key_signature: string;
    label_id?: number;
    label_name: string;
    license: string;
    original_content_size: number;
    original_format: string;
    playback_count: number;
    purchase_title?: string;
    purchase_url: string;
    release: string;
    release_day?: number;
    release_month?: number;
    release_year?: number;
    sharing: string;
    state: string;
    stream_url: string;
    streamable: boolean;
    tag_list: string;
    title: string;
    track_type: string;
    user: User;
    user_id: number;
    video_url?: string;
    waveform_url: string;
}

class SoundCloud {
    private debug = true;
    private useSandBox = false;
    private domain = null;

    private apiKey = null;
    private secureDocument = true;

    private xhrs: JQueryXHR[] = [];

    // shuffle the array
    static shuffleArray<T>(arr: T[]): T[] {
        arr.sort(function() { return 1 - Math.floor(Math.random() * 3); } );
        return arr;
    }

    constructor(options: APIOptions) {
        this.apiKey = options.apiKey;
        this.useSandBox = options.useSandBox || false;

        this.domain = this.useSandBox ? 'sandbox-soundcloud.com' : 'soundcloud.com';
    }

    abort = () => {
        this.xhrs.map(function(xhr) {
            xhr.abort();
        });
    }

    apiUrl = (url: string, apiKey: string = this.apiKey) => {
        var resolver = ( this.secureDocument || (/^https/i).test(url) ? 'https' : 'http') + '://api.' + this.domain + '/resolve?url=',
            params = 'format=json&consumer_key=' + apiKey;

        // force the secure url in the secure environment
        if( this.secureDocument ) {
            url = url.replace(/^http:/, 'https:');
        }

        // check if it's already a resolved api url
        if ( (/api\./).test(url) ) {
            return url + '?' + params;
        } else {
            return resolver + url + '&' + params;
        }
    };

    loadTracksFromLink(link: Link, callback: (tracks: Track[]) => void, tracks: Track[] = []) {
        this.loadTracksFromLinks([link], callback, tracks);
    }

    loadTracksFromLinks(links: Link[], callback: (tracks: Track[]) => void, tracks: Track[] = []): void {
        var tracks: Track[] = [];

        var forks = 0;
        for(var i in links) {
            var link = links[i];

            var apiUrl = this.apiUrl(link.url);

            forks += 1;
            var xhr: JQueryXHR = $.getJSON(apiUrl, function(data: any) {
                // log('data loaded', link.url, data);
                if(data.tracks) {
                    // log('data.tracks', data.tracks);
                    tracks = tracks.concat(data.tracks);
                } else if(data.duration) {
                    // if track, add to player
                    tracks.push(data);
                } else if(data.creator) {
                    // it's a group!
                    var link: Link = {url:data.uri + '/tracks'};
                    forks += 1;
                    this.loadTracksFromLink(link, function(newTracks: Track[]) {
                        tracks = tracks.concat(newTracks);
                        forks -= 1;
                        if(forks == 0) {
                            callback(tracks);
                        }
                    });
                } else if(data.username) {
                    // if user, get his tracks or favorites
                    var link: Link = null;
                    if(/favorites/.test(data.url)) {
                        link = {url: data.uri + '/favorites'};
                    } else {
                        link = {url: data.uri + '/tracks'};
                    }
                    forks += 1;

                    this.loadTracksFromLink(link, function(newTracks: Track[]) {
                        tracks = tracks.concat(newTracks);
                        forks -= 1;
                        if(forks == 0) {
                            callback(tracks);
                        }
                    });
                } else if($.isArray(data)) {
                    tracks = tracks.concat(data);
                }

                forks -= 1;
                if(forks == 0) {
                    callback(tracks);
                }
            }.bind(this));

            xhr.always(() => {
                var idx = this.xhrs.indexOf(xhr);
                if(idx !== -1) {
                    this.xhrs.splice(idx, 1);
                }
            });

            this.xhrs.push(xhr);
        }

        if(forks == 0) {
            callback(tracks);
        }
    }

    streamUrlFromTrack(track: Track, apiKey: string = this.apiKey) {
        return track.stream_url + (/\?/.test(track.stream_url) ? '&' : '?') + 'consumer_key=' + apiKey;
    }
}
