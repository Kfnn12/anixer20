async function check() {
  try {
    const raw = await fetch("https://xerv2.vercel.app/api/v2/animekai/search/advanced?q=%20");
    const json = await raw.json();
    console.log(json.data.filters);
  } catch(e) {
    console.error(e);
  }
}
check();
