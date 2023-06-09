# deep-foundation

[![Gitpod](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/deep-foundation/dev)  
[![Discord](https://badgen.net/badge/icon/discord?icon=discord&label&color=purple)](https://discord.gg/deep-foundation)

## gitpod usage

Everything starts automatically. Just watch the terminal.

When all tasks are done, you can open - http://localhost:3007/ **(ctrl/cmd + click by link)**


## local usage

- make sure to use node v16.20.0 (we recommend to use nvm)
- install docker and docker-compose
- `git clone https://github.com/deep-foundation/dev.git; cd dev; npm ci; npm run packages; npm run local;`
- `npm run local-migrate;` with `npm run local` started

## server usage

- install

```sh
apt update
apt install -y git curl docker.io docker-compose
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install v16.20.0 && nvm use v16.20.0
npm i -g npm@latest

git clone https://github.com/deep-foundation/dev
(cd dev && node configure-nginx.js --deepcase-domain chatgpt.deep.foundation --deeplinks-domain deeplinks.chatgpt.deep.foundation --certbot-email drakonard@gmail.com)

npm install --unsafe-perm -g @deep-foundation/deeplinks@latest
export HASURA_ADMIN_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'));") && export POSTGRES_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'));") && export MINIO_ACCESS_KEY=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'));") && export MINIO_SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'));"); tee call-options.json << JSON
{
  "operation": "run",
  "envs": {
    "DEEPLINKS_PUBLIC_URL": "https://deeplinks.chatgpt.deep.foundation",
    "NEXT_PUBLIC_DEEPLINKS_URL": "https://deeplinks.chatgpt.deep.foundation",
    "NEXT_PUBLIC_GQL_PATH": "deeplinks.chatgpt.deep.foundation/gql",
    "NEXT_PUBLIC_GQL_SSL": "1",
    "NEXT_PUBLIC_DEEPLINKS_SERVER": "https://chatgpt.deep.foundation",
    "JWT_SECRET": "'{\"type\":\"HS256\",\"key\":\"$(node -e "console.log(require('crypto').randomBytes(50).toString('base64'));")\"}'",
    "DEEPLINKS_HASURA_STORAGE_URL": "http://host.docker.internal:8000/",
    "HASURA_GRAPHQL_ADMIN_SECRET": "$HASURA_ADMIN_SECRET",
    "MIGRATIONS_HASURA_SECRET": "$HASURA_ADMIN_SECRET",
    "DEEPLINKS_HASURA_SECRET": "$HASURA_ADMIN_SECRET",
    "POSTGRES_PASSWORD": "$POSTGRES_PASSWORD",
    "HASURA_GRAPHQL_DATABASE_URL": "postgres://postgres:$POSTGRES_PASSWORD@postgres:5432/postgres",
    "POSTGRES_MIGRATIONS_SOURCE": "postgres://postgres:$POSTGRES_PASSWORD@host.docker.internal:5432/postgres?sslmode=disable",
    "RESTORE_VOLUME_FROM_SNAPSHOT": "0",
    "MINIO_ROOT_USER": "$MINIO_ACCESS_KEY",
    "MINIO_ROOT_PASSWORD": "$MINIO_SECRET_KEY",
    "S3_ACCESS_KEY": "$MINIO_ACCESS_KEY",
    "S3_SECRET_KEY": "$MINIO_SECRET_KEY"
  }
}
JSON
export DEEPLINKS_CALL_OPTIONS=$(cat call-options.json); deeplinks
```

- uninstall
```
(cd dev && npm run docker-clear && rm /tmp/.migrate)
```

## manual terminal methods

### gitpod

Automatic

- `npm run gitpod-start` gitpod start u

OR

- `npm run gitpod-local` local launch processes
- `npm run gitpod-recreate` docker/migrations clear/init

Manual

- `npm ci; npm run git-shh-to-https; npm run packages` before all, only ONCE PER GITPOD CONTAINER!
- `npm ci; npm run git-shh-to-https; npm run gitpod` gitpod start up

### local

Automatic

- `npm run local` local launch processes
- `npm run local-recreate` docker/migrations clear/init

Manual

- `npm ci && npm run packages` before all, only ONCE PER GITPOD CONTAINER!

### useful

- `npm run rm-migrates` to delete all .migrate artifacts of npm migrate package

## unsafe gulp methods

- **attention! before work checkout to branch from detached commits in each needed submodule**
- `npm run gulp -- packages:get` clone and install all packages **starts automatically in workspace**
- `(cd packages/hasura && npm run docker-local)` start docker postgres and hasura locally **starts automatically in workspace**
- `npm run gulp -- packages:set` fast git add git commit and git push deepcase repo
- `npm run gulp -- package:insert --url HTTPGITURL --name NAMEINPACKAGESDIRECTORY` insert submodule
- `npm run gulp -- package:delete --name NAMEINPACKAGESDIRECTORY` delete submodule
- `npm run gulp -- assets:update` copy all assets from ./assets in to each package
- `npm run gulp -- packages:sync` sync all dependenced packages in workspace
