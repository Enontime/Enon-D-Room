# Enon Home

## Product intent

This is a personal digital home represented as an explorable 3D space.

The world itself is the primary user interface.

Objects in the world should represent real usable capabilities whenever possible,
rather than acting only as decorative links.

## Core interaction

World -> approach object -> interact -> use application -> return to world.

## Development rule

Always maintain a working vertical slice.

Do not spend substantial effort on visual polish until:
movement, collision, interaction, application transitions, and local terminal work.

## Architecture

Keep these concerns separated:

- world rendering
- player movement
- interaction detection
- interactive objects
- applications
- local system backend

## Terminal

The terminal should eventually be a real local PTY-backed shell.

The local backend must listen only on localhost during development.

## Verification

After significant changes, verify the complete interaction loop in the browser.

Do not claim completion when a required behavior has not been exercised.