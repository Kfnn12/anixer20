async function run() {
  try {
    let url = 'https://xerv2.vercel.app/api/v2/animekai/home';
    let res = await fetch(url);
    console.log("home", res.status);
    
    url = 'https://xerv2.vercel.app/api/v2/animekai/anime/cardfight-vanguard-15th-anniv-remastered-e22jm/episodes';
    res = await fetch(url);
    console.log("episodes", res.status);
  } catch(e) {
    console.log(e);
  }
}
run();
