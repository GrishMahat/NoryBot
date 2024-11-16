const messageConfig = {
  embedColors: {
    success: '#00D26A', // Color for successful actions
    warning: '#FFCC4D', // Color for warning messages
    error: '#FB2F61', // Color for error messages
  },
  embedErrorMessage:
    '`❌` An unexpected error occurred. Please try again later.',
  commandDevOnly:
    '`❌` This command is restricted to developers only. If you believe you should have access, please contact an administrator.',
  commandTestMode:
    '`❌` This command is currently in development and cannot be executed on this server. Please check back later for updates.',
  nsfw: '`❌` This command can only be used in NSFW (Not Safe For Work) channels. Please switch to an appropriate channel to proceed.',
  commandCooldown:
    'Please wait `{time}` seconds before attempting to use this command again. Patience is appreciated!',
  commandPremiumOnly:
    '`❌` This command is exclusive to premium users. Upgrade your account to access this feature.',
  userNoPermissions:
    '`❌` You do not have the required permissions to execute this command. Please check your role and permissions or contact an administrator for assistance.',
  botNoPermissions:
    '`❌` I lack the necessary permissions to execute this command. Please ensure I have the required roles and permissions.',
  hasHigherRolePosition:
    '`❌` The user you are trying to interact with has a higher role than yours or shares the same role level. Please choose another user.',
  unableToInteractWithYourself:
    '`❌` You cannot perform this action on yourself. Please select another user to proceed.',
  cannotUseButton:
    '`❌` You cannot interact with this button at this time. Please ensure you meet the requirements to use it.',
  cannotUseSelect:
    '`❌` You cannot use this select menu at this time. Ensure you meet all prerequisites before attempting again.',
};

export default messageConfig;
