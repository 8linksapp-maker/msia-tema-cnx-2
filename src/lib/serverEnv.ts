/**
 * serverEnv.ts — leitura de credenciais de ambiente em RUNTIME.
 *
 * Por que não usar `import.meta.env.GITHUB_TOKEN` direto:
 * o Vite INLINA `import.meta.env.X` em build-time. Uma env var adicionada
 * no dashboard da Vercel DEPOIS do build fica gravada como `undefined` no
 * bundle — setar a chave e dar "redeploy" (com cache de build) não resolve.
 *
 * `process.env`, numa função serverless Node da Vercel, reflete as env vars
 * do projeto NA HORA da requisição. Por isso lemos process.env primeiro,
 * com fallback pro import.meta.env (que cobre o `bun run dev` local, onde
 * o Astro carrega o .env em import.meta.env).
 *
 * Doc Astro: "With most adapters you can access environment variables with
 * process.env" — https://docs.astro.build/en/guides/environment-variables
 */
export function readGithubEnv() {
    return {
        token: (process.env.GITHUB_TOKEN ?? import.meta.env.GITHUB_TOKEN ?? '').trim(),
        owner: (process.env.GITHUB_OWNER ?? import.meta.env.GITHUB_OWNER ?? '').trim(),
        repo: (process.env.GITHUB_REPO ?? import.meta.env.GITHUB_REPO ?? '').trim(),
    };
}

/** DEPLOY_HOOK_URL — mesmo motivo do readGithubEnv: precisa ser lido em runtime. */
export function readDeployHookUrl(): string {
    return (process.env.DEPLOY_HOOK_URL ?? import.meta.env.DEPLOY_HOOK_URL ?? '').trim();
}
