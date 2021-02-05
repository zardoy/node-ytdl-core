import FORMATS from './formats';
import * as utils from './utils';

export type Filter =
  | 'audioandvideo'
  | 'videoandaudio'
  | 'video'
  | 'videoonly'
  | 'audio'
  | 'audioonly'
  | ((format: VideoFormat) => boolean);

interface ChooseFormatOptions {
  // To remove string
  quality?: 'lowest' | 'highest' | 'highestaudio' | 'lowestaudio' | 'highestvideo' | 'lowestvideo' | string | number | string[] | number[];
  filter?: Filter;
  format?: VideoFormat;
}

export interface VideoFormat {
  itag: number;
  url: string;
  mimeType?: string;
  bitrate?: number;
  audioBitrate?: number;
  width?: number;
  height?: number;
  initRange?: { start: string; end: string; };
  indexRange?: { start: string; end: string; };
  lastModified: string;
  contentLength: string;
  quality: 'tiny' | 'small' | 'medium' | 'large' | 'hd720' | 'hd1080' | 'hd1440' | 'hd2160' | 'highres' | string;
  qualityLabel: '144p' | '144p 15fps' | '144p60 HDR' | '240p' | '240p60 HDR' | '270p' | '360p' | '360p60 HDR'
  | '480p' | '480p60 HDR' | '720p' | '720p60' | '720p60 HDR' | '1080p' | '1080p60' | '1080p60 HDR' | '1440p'
  | '1440p60' | '1440p60 HDR' | '2160p' | '2160p60' | '2160p60 HDR' | '4320p' | '4320p60';
  projectionType?: 'RECTANGULAR';
  fps?: number;
  averageBitrate?: number;
  audioQuality?: 'AUDIO_QUALITY_LOW' | 'AUDIO_QUALITY_MEDIUM';
  colorInfo?: {
    primaries: string;
    transferCharacteristics: string;
    matrixCoefficients: string;
  };
  highReplication?: boolean;
  approxDurationMs?: string;
  targetDurationSec?: number;
  maxDvrDurationSec?: number;
  audioSampleRate?: string;
  audioChannels?: number;

  // Added by ytdl-core
  container: 'flv' | '3gp' | 'mp4' | 'webm' | 'ts';
  hasVideo: boolean;
  hasAudio: boolean;
  codecs: string;
  videoCodec?: string;
  audioCodec?: string;

  isLive: boolean;
  isHLS: boolean;
  isDashMPD: boolean;
}

// Use these to help sort formats, higher index is better.
const audioEncodingRanks = [
  'mp4a',
  'mp3',
  'vorbis',
  'aac',
  'opus',
  'flac',
];
const videoEncodingRanks = [
  'mp4v',
  'avc1',
  'Sorenson H.283',
  'MPEG-4 Visual',
  'VP8',
  'VP9',
  'H.264',
];

const getVideoBitrate = format => format.bitrate || 0;
const getVideoEncodingRank = format =>
  videoEncodingRanks.findIndex(enc => format.codecs && format.codecs.includes(enc));
const getAudioBitrate = format => format.audioBitrate || 0;
const getAudioEncodingRank = format =>
  audioEncodingRanks.findIndex(enc => format.codecs && format.codecs.includes(enc));


/**
 * Sort formats by a list of functions.
 */
const sortFormatsBy = (a: object, b: object, sortBy: NonNullable<Parameters<typeof Array.prototype.sort>[0]>): number => {
  let res = 0;
  for (const fn of sortBy) {
    res = fn(b) - fn(a);
    if (res !== 0) {
      break;
    }
  }
  return res;
};

const sortFormatsByVideo = (a, b) => sortFormatsBy(a, b, [
  format => parseInt(format.qualityLabel),
  getVideoBitrate,
  getVideoEncodingRank,
]);


const sortFormatsByAudio = (a, b) => sortFormatsBy(a, b, [
  getAudioBitrate,
  getAudioEncodingRank,
]);


/**
 * Sort formats from highest quality to lowest.
 */
export const sortFormats = (a: object, b: object): number => sortFormatsBy(a, b, [
  // Formats with both video and audio are ranked highest.
  format => +!!format.isHLS,
  format => +!!format.isDashMPD,
  format => +(format.contentLength > 0),
  format => +(format.hasVideo && format.hasAudio),
  format => +format.hasVideo,
  format => parseInt(format.qualityLabel) || 0,
  getVideoBitrate,
  getAudioBitrate,
  getVideoEncodingRank,
  getAudioEncodingRank,
]);


/**
 * Choose a format depending on the given options.
 *
 * @throws {Error} when no format matches the filter/format rules
 */
export const chooseFormat = (
  formats: VideoFormat | VideoFormat[],
  options?: ChooseFormatOptions,
): VideoFormat | never => {
  if (typeof options.format === 'object') {
    if (!options.format.url) {
      throw Error('Invalid format given, did you use `ytdl.getInfo()`?');
    }
    return options.format;
  }

  if (options.filter) {
    formats = filterFormats(formats, options.filter);
  }

  let format;
  const quality = options.quality || 'highest';
  switch (quality) {
    case 'highest':
      format = formats[0];
      break;

    case 'lowest':
      format = formats[formats.length - 1];
      break;

    case 'highestaudio':
      formats = filterFormats(formats, 'audio');
      formats.sort(sortFormatsByAudio);
      format = formats[0];
      break;

    case 'lowestaudio':
      formats = filterFormats(formats, 'audio');
      formats.sort(sortFormatsByAudio);
      format = formats[formats.length - 1];
      break;

    case 'highestvideo':
      formats = filterFormats(formats, 'video');
      formats.sort(sortFormatsByVideo);
      format = formats[0];
      break;

    case 'lowestvideo':
      formats = filterFormats(formats, 'video');
      formats.sort(sortFormatsByVideo);
      format = formats[formats.length - 1];
      break;

    default:
      format = getFormatByQuality(quality, formats);
      break;
  }

  if (!format) {
    throw Error(`No such format found: ${quality}`);
  }
  return format;
};

/**
 * Gets a format based on quality or array of quality's
 *
 */
const getFormatByQuality = (quality: string | string[], formats: object): object => {
  const getFormat = itag => formats.find(format => `${format.itag}` === `${itag}`);
  if (Array.isArray(quality)) {
    return getFormat(quality.find(q => getFormat(q)));
  } else {
    return getFormat(quality);
  }
};

export const filterFormats = (formats: VideoFormat | VideoFormat[], filter?: Filter): VideoFormat[] => {
  let fn;
  switch (filter) {
    case 'videoandaudio':
    case 'audioandvideo':
      fn = format => format.hasVideo && format.hasAudio;
      break;

    case 'video':
      fn = format => format.hasVideo;
      break;

    case 'videoonly':
      fn = format => format.hasVideo && !format.hasAudio;
      break;

    case 'audio':
      fn = format => format.hasAudio;
      break;

    case 'audioonly':
      fn = format => !format.hasVideo && format.hasAudio;
      break;

    default:
      if (typeof filter === 'function') {
        fn = filter;
      } else {
        throw TypeError(`Given filter (${filter}) is not supported`);
      }
  }
  return formats.filter(format => !!format.url && fn(format));
};

export const addFormatMeta = (format: object): object => {
  format = Object.assign({}, FORMATS[format.itag], format);
  format.hasVideo = !!format.qualityLabel;
  format.hasAudio = !!format.audioBitrate;
  format.container = format.mimeType ?
    format.mimeType.split(';')[0].split('/')[1] : null;
  format.codecs = format.mimeType ?
    utils.between(format.mimeType, 'codecs="', '"') : null;
  format.videoCodec = format.hasVideo && format.codecs ?
    format.codecs.split(', ')[0] : null;
  format.audioCodec = format.hasAudio && format.codecs ?
    format.codecs.split(', ').slice(-1)[0] : null;
  format.isLive = /\bsource[/=]yt_live_broadcast\b/.test(format.url);
  format.isHLS = /\/manifest\/hls_(variant|playlist)\//.test(format.url);
  format.isDashMPD = /\/manifest\/dash\//.test(format.url);
  return format;
};
