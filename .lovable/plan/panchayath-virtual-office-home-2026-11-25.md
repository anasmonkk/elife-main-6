# Panchayath Virtual Office Home

## What will change
- Make the Panchayath Virtual Office the default home view while preserving the existing Classic Home behind a clear switch.
- Add a searchable Panchayath selector, persist the visitor's selected home view, and support direct links that lock to a Panchayath.
- Show published Office Manager and Secretary cards with call and WhatsApp actions, local hierarchy information, relevant programs, and citizen-support links.
- Add Panchayath-specific public announcements and a secure posting flow limited to the assigned Office Manager.
- Keep this work focused on the public home experience; administrator assignment controls remain a separate pending item.

## Technical approach
- Build the office view as a separate home component and share home-view preference between the home page and site header.
- Reuse the existing public Virtual Office contact projection. Add a narrowly scoped public database function for the local agent list, exposing only display name, role, ward, and parent relationship; keep agent mobile numbers and other private fields out of the network list.
- Store Virtual Office announcements separately from general Panchayath notes and authorize Office Manager changes through a server-checked agent action; expose only published announcement content to visitors.
- Read public programs for the selected Panchayath and preserve the existing Classic Home content unchanged.

## Verification
- Check office selection, direct-link locking, view preference persistence, contact actions, and the switch back to Classic Home.
- Verify visitors can read announcements while only the assigned Office Manager can change them.
- Verify the layout at desktop and mobile sizes and run the project's relevant tests.