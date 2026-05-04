import fetch from "node-fetch";

async function run() {
  const url = "http://localhost:3000/api/proxy?url=" + encodeURIComponent("https://test-streams.mux.dev/x36xhzz/url_6/193039199_mp4_h264_aac_ld_7_000.ts");
  console.log("Fetching: " + url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    console.log("Headers:", res.headers.raw());
    const length = parseInt(res.headers.get("content-length") || "0", 10);
    console.log("Length:", length);
    
    // Read the body
    const body = await res.arrayBuffer();
    console.log("Read chunks, total bytes:", body.byteLength);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
