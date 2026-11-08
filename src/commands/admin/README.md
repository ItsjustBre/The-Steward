# The B Continental — setup command

Copy `src/commands/admin/setupcontinental.js` to the same path in your repository.

This is an ES module command for discord.js v14. It uses `data`, `execute`, and `handleButton` exports through the default object.

## Button routing (required)

In your existing `InteractionCreate` event, before your other button handlers, add:

```js
import setupcontinental from '../commands/admin/setupcontinental.js';

// Inside your interaction event's execute(interaction) function:
if (interaction.isButton() && interaction.customId.startsWith('continental:')) {
  await setupcontinental.handleButton(interaction);
  return;
}
```

Adjust the relative import path to match the location of your interaction event.

Your existing command loader must register the `setupcontinental` slash command, as it does for `testwelcome`. If it does not automatically register new commands, run your existing deploy/register script.

## Permissions

The Steward needs Manage Channels, View Channel, and the ability to respond to interactions. For automatic posts in public announcement channels, it also receives explicit View/Send permission on newly created channels.

The command refuses to create interest-restricted channels without a matching role. Confirm the role names in `ROLE_ALIASES` before running. Existing channels are skipped and their permissions are not changed.

## Run

Use `/setupcontinental`, review the ephemeral preview, and click Create. Repeat safely to create channels that were previously blocked by missing roles.

Note: A server owner or members with Administrator permission can see restricted channels regardless of channel overwrites. Test private-channel visibility with a non-admin account.
