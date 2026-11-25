/* Conversione dei formati che il browser non apre (MOV HEVC, MKV, AVI, WMV, MTS, HEIC, WMA…) con ffmpeg in WebAssembly.
   ffmpeg.wasm (@ffmpeg/core 0.12.10) — GPL-2.0-or-later — https://github.com/ffmpegwasm/ffmpeg.wasm */
importScripts('ffmpeg-core.js');
let core = null;
onmessage = async e => {
  const { file, args, out } = e.data;
  try {
    if (!core) core = await self.createFFmpegCore({ locateFile: p => new URL(p, self.location.href).href });
    core.setLogger(({ message }) => {
      const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(message); if (d) postMessage({ dur: +d[1] * 3600 + +d[2] * 60 + +d[3] });
      const t = /time=(\d+):(\d+):([\d.]+)/.exec(message); if (t) postMessage({ t: +t[1] * 3600 + +t[2] * 60 + +t[3] });
    });
    try { core.FS.mkdir('/in'); } catch (_) { }
    core.FS.mount(core.FS.filesystems.WORKERFS, { files: [file] }, '/in');
    core.exec(...args.map(a => a === 'IN' ? '/in/' + file.name : a));
    const ret = core.ret; core.reset();
    try { core.FS.unmount('/in'); } catch (_) { }
    if (ret !== 0) throw new Error('conversione non riuscita (codice ' + ret + ')');
    const data = core.FS.readFile(out); try { core.FS.unlink(out); } catch (_) { }
    postMessage({ done: data }, [data.buffer]);
  } catch (err) { try { core && core.FS.unmount('/in'); } catch (_) { } postMessage({ error: String(err && err.message || err) }); }
};
