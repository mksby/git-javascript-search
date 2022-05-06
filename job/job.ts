import { config } from "https://deno.land/x/dotenv/mod.ts";
import { ensureDir } from 'https://deno.land/std@0.110.0/fs/mod.ts';
import { Base64 } from "https://deno.land/x/bb64/mod.ts";
import axiod from 'https://deno.land/x/axiod/mod.ts';

const { GITHUB_TOKEN }  = config();

const headers = {
  headers: {
    'user-agent': 'node js',
    'Authorization': `token ${GITHUB_TOKEN}`
  }
}

function run(page: number) {
  console.log('run', page);
  // const reps = `https://api.github.com/search/repositories?q=angular+in:readme+sort:stars-desc&per_page=100&page=${page}`;
  const reps = `https://api.github.com/search/repositories?q=angular+in:readme+sort:updated-desc&per_page=100&page=${page}`;

  axiod.get(reps, headers)
    .then(async (body) => {
      let checked = 0;

      return Promise.all(body.data.items.map(async (repository: any) => {
        return axiod.get(repository.trees_url.replace('{/sha}', `/${repository.default_branch}`), headers)
          .then(async (tree) => {
            const file = tree.data.tree.find((d: any) => d.path === 'package.json');

            if (!file) {
              console.log(`checked: ${++checked}`);
              return;
            }

            await ensureDir(`./data/${repository.id}`);

            await Deno.writeTextFile(`./data/${repository.id}/repository.json`, JSON.stringify(repository, null, 4));
            await Deno.writeTextFile(`./data/${repository.id}/tree.json`, JSON.stringify(tree.data.tree, null, 4));

            return axiod.get(file.url, headers)
              .then(async (file: any) => {
                await Deno.writeTextFile(`./data/${repository.id}/package.json`, JSON.stringify(JSON.parse(Base64.fromBase64String(file.data.content).toString()), null, 4));
                console.log(`checked: ${++checked}`);
              })
          })
      }))
    }).then(() => {
    run(page + 1)
  }).catch(console.error);
}

run(1);
