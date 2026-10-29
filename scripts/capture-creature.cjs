/**
 * Build a GitHub profile-ready card using REAL artwork and stats from
 * https://www.githubcreature.com/strhercules (not placeholders).
 * If extraction fails, this script does not change the README.
 * Run from the repository root via the GitHub Actions workflow.
 */
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_REQUIRE || 'playwright');
const site = 'https://www.githubcreature.com/strhercules';
const asset = 'assets/github-creature-strhercules.svg';
const xml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function wrap(s, width=55, limit=8) {
  const out=[]; let line='';
  for (const word of s.replace(/\s+/g,' ').trim().split(' ')) {
    if (line && line.length+word.length+1>width) {out.push(line);line=word}
    else line+=(line?' ':'')+word;
  }
  if(line)out.push(line);
  if(out.length>limit){out.length=limit;out[limit-1]=out[limit-1].replace(/[.,;: ]+$/,'')+'…'}
  return out;
}
const stat=(text,label)=>{
  const found=text.replace(/\s+/g,' ').match(new RegExp('\\b'+label+'\\s+([\\d,]+)','i'));
  if(!found)throw Error('Missing real '+label+' statistic on creature page');
  return found[1];
};
function svg(data) {
 const {name,description,portrait,contributions,followers,stars}=data;
 const descriptionLines=wrap(description);
 const lines=descriptionLines.map((line,i)=>'<tspan x="358" y="'+(210+i*19)+'">'+xml(line)+'</tspan>').join('\n');
 return [
 '<svg xmlns="http://www.w3.org/2000/svg" width="830" height="520" viewBox="0 0 830 520" role="img">',
 '<title>'+xml(name)+' — STRHercules GitHub Creature</title>',
 '<defs>',
 '<linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#201227"/><stop offset=".65" stop-color="#12121d"/><stop offset="1" stop-color="#0c1b21"/></linearGradient>',
 '<linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#a581ff"/><stop offset="1" stop-color="#35d6c4"/></linearGradient>',
 '<clipPath id="art"><rect x="48" y="98" width="274" height="324" rx="13"/></clipPath>',
 '</defs>',
 '<rect width="830" height="520" fill="#0d1117" rx="24"/>',
 '<rect x="11" y="11" width="808" height="498" rx="23" fill="url(#panel)" stroke="url(#edge)" stroke-width="2"/>',
 '<path d="M33 42h20 M33 42v20 M796 42h-20 M796 42v20 M33 478h20 M33 478v-20 M796 478h-20 M796 478v-20" fill="none" stroke="#9571e2" stroke-opacity=".45" stroke-width="2"/>',
 '<rect x="45" y="95" width="280" height="330" rx="15" stroke="#9c7bfb" stroke-width="2" fill="#101422"/>',
 '<image x="48" y="98" width="274" height="324" preserveAspectRatio="xMidYMid slice" clip-path="url(#art)" href="data:image/png;base64,'+portrait.toString('base64')+'"/>',
 '<text x="358" y="105" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="#35d6c4">@STRHercules</text>',
 '<text x="358" y="153" font-family="Arial,sans-serif" font-size="25" font-weight="bold" fill="#f1eaff">'+xml(name)+'</text>',
 '<line x1="358" y1="172" x2="780" y2="172" stroke="#7c60c7" stroke-opacity=".55"/>',
 '<text font-family="Arial,sans-serif" font-size="12.5" fill="#c4c7d7">'+lines+'</text>',
 '<line x1="358" y1="370" x2="780" y2="370" stroke="#7c60c7" stroke-opacity=".5"/>',
 '<text x="358" y="399" font-family="Arial,sans-serif" font-size="11" letter-spacing="1" fill="#35d6c4">CONTRIBUTIONS</text>',
 '<text x="530" y="399" font-family="Arial,sans-serif" font-size="11" letter-spacing="1" fill="#35d6c4">FOLLOWERS</text>',
 '<text x="674" y="399" font-family="Arial,sans-serif" font-size="11" letter-spacing="1" fill="#35d6c4">STARS</text>',
 '<text x="358" y="432" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#f4f3ff">'+xml(contributions)+'</text>',
 '<text x="530" y="432" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#f4f3ff">'+xml(followers)+'</text>',
 '<text x="674" y="432" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#f4f3ff">'+xml(stars)+'</text>',
 '<line x1="358" y1="461" x2="780" y2="461" stroke="#7c60c7" stroke-opacity=".35"/>',
 '<text x="780" y="483" text-anchor="end" font-family="Arial,sans-serif" font-size="12" fill="#8b96ac">githubcreature.com · Summoned from code, forged in commits</text>',
 '</svg>'
 ].join('\n');
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let data;
 try {
  const page=await browser.newPage({viewport:{width:1300,height:1000},deviceScaleFactor:2});
  await page.goto(site,{waitUntil:'domcontentloaded',timeout:90000});
  const card=page.locator('#creature-card-strhercules');
  await card.waitFor({state:'visible',timeout:45000});
  const image=card.locator('img').first();
  await image.scrollIntoViewIfNeeded();
  await image.evaluate(img=>img.decode());
  const name=(await card.locator('[data-export="title"]').innerText()).trim();
  const description=(await card.locator('p.leading-relaxed').first().innerText()).trim();
  if(!name || !description)throw Error('Creature identity unavailable: refusing to fabricate');
  const portrait=await image.screenshot({type:'png',animations:'disabled'});
  const stats=(await page.locator('aside').first().textContent())||'';
  data={name,description,portrait,
   contributions:stat(stats,'Contributions'),
   followers:stat(stats,'Followers'),
   stars:stat(stats,'Stars')};
 } finally {await browser.close()}
 fs.mkdirSync('assets',{recursive:true});
 fs.writeFileSync(asset,svg(data),'utf8');
 const readme=fs.readFileSync('README.md','utf8');
 const needle=/<img src="\.\/assets\/creature-gateway\.svg" alt="[^"]+" width="760" \/>/;
 const replacement='<img src="./assets/github-creature-strhercules.svg" alt="My real GitHub Creature card" width="760" />';
 if(!needle.test(readme) && !readme.includes(replacement))throw Error('Creature section not found in README');
 let next=readme.replace(needle,replacement);
 next=next.replace(/<!-- To replace the gateway card with your original creature art:[\s\S]*?-->/,'<!-- This card uses genuine artwork and stats fetched by the GitHub Creature capture workflow. -->');
 fs.writeFileSync('README.md',next,'utf8');
 console.log('Created real card: '+data.name+' and updated README.md');
})().catch(error=>{console.error(error);process.exitCode=1;});
