import { writeFileSync, existsSync, mkdirSync } from 'fs';
import axios from 'axios';

const page = 1;
const reps = `https://api.github.com/search/repositories?q=angular+in:readme+sort:stars-desc&per_page=100&page=${page}`;

const headers = {
  headers: {
    'user-agent': 'node js',
    'Authorization': `token ${process.env.GITHUB_TOKEN}`
  }
}

function run() {
  axios.get(reps, headers)
    .then(async (body) => {
      let checked = 0;

      await Promise.all(body.data.items.map(async (repository) => {
        return axios.get(repository.trees_url.replace('{/sha}', `/${repository.default_branch}`), headers)
          .then(async (tree) => {
            const file = tree.data.tree.find(d => d.path === 'package.json');

            if (!file) {
              console.log(`checked: ${++checked}`);
              return;
            }

            if (!existsSync('./data')){
              mkdirSync('./data');
            }

            if (!existsSync(`./data/${repository.id}`)){
              mkdirSync(`./data/${repository.id}`);
            }

            writeFileSync(`./data/${repository.id}/repository.json`, JSON.stringify(repository, null, 4));
            writeFileSync(`./data/${repository.id}/tree.json`, JSON.stringify(tree.data.tree, null, 4));

            return axios.get(file.url, headers)
              .then(async (file) => {
                writeFileSync(`./data/${repository.id}/package.json`, JSON.stringify(JSON.parse(Buffer.from(file.data.content, 'base64').toString()), null, 4));
                console.log(`checked: ${++checked}`);
              })
          })
      })).catch(console.error);
    })
}

run();
