# Security

## What this project never does

- Does not store or require trading private keys  
- Does not auto-submit follower trades in default (`MODE=paper`)  
- Does not log full `RPCEDGE_KEY` values in pretty output  

## Reporting a vulnerability

Email **rpcedge@gmail.com** with:

- description and impact  
- reproduction steps  
- whether any key material may have been exposed  

Please do not open a public issue for key leaks or auth bypasses.

## Keys

- Mint keys only at https://app.rpcedge.com  
- Put them in env / `.env` (gitignored)  
- Rotate a key from the dashboard if it was pasted into chat, a ticket, or a public gist  
