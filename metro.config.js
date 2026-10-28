
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const kaynak = context.originModulePath.replace(/\\/g, '/');

  if (
    platform === 'android' &&
    moduleName === './TopicSubscriptionModule' &&
    kaynak.includes('/expo-notifications/build/topicSubscription.js')
  ) {
    return {
      type: 'sourceFile',
      filePath: path.join(
        path.dirname(context.originModulePath),
        'TopicSubscriptionModule.js'
      ),
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
