<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep release visibility and exact episode/acervo linkage in the browser-safe `src/lib/release-schedule.ts`, shared by admin and legacy renderers, to avoid divergent release rules; EP00 never cascades.
- Scheduling uses the existing content payload and visitor clock, not a confidential server embargo; preserve draft sanitization and existing RLS without new parallel persistence.
