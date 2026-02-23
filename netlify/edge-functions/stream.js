export default async (request, context) => {
  const upstream = "http://nr11.newradio.it:9242/stream?type=http&nocache=147999";

  // Pass-through streaming: Netlify edge (Deno) restituisce il body come stream
  const res = await fetch(upstream, {
    headers: {
      "User-Agent": "GrandangoloRadioProxy/1.0",
      "Icy-MetaData": "1",
    },
  });

  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");

  // se manca, proviamo a impostare un content-type sensato
  if (!headers.get("content-type")) headers.set("content-type", "audio/mpeg");

  return new Response(res.body, { status: res.status, headers });
};
