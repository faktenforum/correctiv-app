import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/http', () => ({ fetchJson: vi.fn() }));

import { RADIO_MOUNTS } from '../src/data/feeds.config';
import { fetchJson } from '../src/services/http';
import { fetchRadioStatus } from '../src/services/radio.service';

/**
 * Reading Icecast's status document.
 *
 * Three things about that document decide this file, and all three were measured
 * against `icecast.correctiv.net` on 2026-09-01:
 *
 * - `source` is an **array** with several mounts and a bare **object** with one.
 *   The server has three today, so the array path is the live one and the object
 *   path is the one that breaks the day two of them are taken down.
 * - the mount name appears nowhere except inside `listenurl`.
 * - `title` joins artist and track with " - " and keeps the separator when the
 *   artist is empty, so the real value arrived as " - Salon5 Mitschnitt …".
 */
const fetchMock = vi.mocked(fetchJson);

function source(mount: string, extra: Record<string, unknown> = {}) {
  return {
    listenurl: `http://icecast.correctiv.net:8000/${mount}`,
    bitrate: 64,
    listeners: 3,
    listener_peak: 86,
    server_name: 'Salon5 low',
    title: ' - Salon5 Mitschnitt 2024 04 05, 17 Uhr 02',
    ...extra,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('reading one mount off the server', () => {
  it('finds the mount among several', async () => {
    fetchMock.mockResolvedValue({
      icestats: {
        source: [
          source('sacharow', { server_name: 'Радио Сахаров', bitrate: 128, listeners: 6 }),
          source('salon5', { bitrate: 128, listeners: 1 }),
          source('salon5low'),
        ],
      },
    });

    const status = await fetchRadioStatus('salon5low');

    expect(status.online).toBe(true);
    expect(status.bitrateKbps).toBe(64);
    expect(status.listeners).toBe(3);
    expect(status.listenerPeak).toBe(86);
    expect(status.stationName).toBe('Salon5 low');
  });

  /** With one mount connected, Icecast drops the array. */
  it('reads a single mount served as a bare object', async () => {
    fetchMock.mockResolvedValue({ icestats: { source: source('salon5low') } });

    expect((await fetchRadioStatus('salon5low')).online).toBe(true);
  });

  it('reports a mount that is not on the server as offline, not as an error', async () => {
    fetchMock.mockResolvedValue({ icestats: { source: [source('sacharow')] } });

    const status = await fetchRadioStatus('salon5low');

    expect(status.online).toBe(false);
    expect(status.nowPlaying).toBeNull();
  });

  it('copes with a server that reports no mounts at all', async () => {
    fetchMock.mockResolvedValue({ icestats: {} });

    expect((await fetchRadioStatus()).online).toBe(false);
  });

  it('asks for the mount the app actually plays by default', async () => {
    fetchMock.mockResolvedValue({ icestats: { source: [source(RADIO_MOUNTS.low.name)] } });

    expect((await fetchRadioStatus()).online).toBe(true);
  });
});

describe('the title on air', () => {
  it('drops the separator Icecast leaves when there is no artist', async () => {
    fetchMock.mockResolvedValue({ icestats: { source: source('salon5low') } });

    expect((await fetchRadioStatus('salon5low')).nowPlaying).toBe(
      'Salon5 Mitschnitt 2024 04 05, 17 Uhr 02',
    );
  });

  it('keeps a real artist and title', async () => {
    fetchMock.mockResolvedValue({
      icestats: { source: source('salon5low', { title: 'Меduza - Сон тринадцатый' }) },
    });

    expect((await fetchRadioStatus('salon5low')).nowPlaying).toBe('Меduza - Сон тринадцатый');
  });

  /** A blank title is "we do not know", and the banner keeps its own subtitle. */
  it.each(['', '   ', ' - ', '–'])('answers null for the title %j', async (title) => {
    fetchMock.mockResolvedValue({ icestats: { source: source('salon5low', { title }) } });
    expect((await fetchRadioStatus('salon5low')).nowPlaying).toBeNull();
  });
});
