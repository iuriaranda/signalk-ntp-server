const NTPServer = require('ntp-time').Server;

module.exports = function (app) {
  var plugin = {};

  plugin.id = 'signalk-ntp-server';
  plugin.name = 'NTP Server';
  plugin.description = 'Starts an NTP server that serves the current time based on the SignalK datetime value at the specified path. If the datetime value is older than the specified maximum time delta, the current server time is provided instead.';

  plugin.schema = {
    title: 'SignalK NTP server',
    type: 'object',
    required: ["port", "sourcePath", "maxTimeDelta"],
    description: `You can configure the server port number, the SignalK path to source the current time from and the maximum amount of time to consider the SignalK data as fresh.`,
    properties: {
      port: {
        type: 'number',
        title: 'Port',
        default: 123
      },
      sourcePath: {
        type: 'string',
        title: 'Path to the SignalK datetime source',
        default: 'navigation.datetime'
      },
      maxTimeDelta: {
        type: 'number',
        title: 'Maximum amount of time to consider the SignalK data in `sourcePath` as fresh (in seconds)',
        default: 60 * 60
      }
    }
  };

  // Functions to call when the plugin stops
  plugin.onStop = [];

  plugin.start = function (options, restartPlugin) {
    app.debug('Plugin starting');

    plugin.server = new NTPServer();
    plugin.datetime = null;

    plugin.server.handle((message, response) => {
      if (plugin.datetime) {
        let lastUpdated = new Date(plugin.datetime.timestamp);
        let delta = Date.now() - lastUpdated.getTime();

        if (delta > 1000 * options.maxTimeDelta) {
          app.debug('navigation.datetime is outdated. Sending current time.');
          message.txTimestamp = Math.floor(Date.now() / 1000);
        } else {
          message.txTimestamp = Math.floor((new Date(plugin.datetime.value).getTime() + delta) / 1000);
          message.rxTimestamp = message.txTimestamp;
          message.referenceTimestamp = Math.floor(lastUpdated.getTime() / 1000);
        }

        if (/gps/.test(plugin.datetime['$source'])) {
          message.referenceId = "GPS";
          message.stratum = 1;
        }
      } else {
        app.debug('No navigation.datetime value available for NTP server. Sending current time.');
        message.txTimestamp = Math.floor(Date.now() / 1000);
      }

      // Disregard leap seconds
      message.leap = 0;

      app.debug("NTP reply", message);
      response(message);
    });

    plugin.server.listen(options.port, err => {
      if (err) {
        app.error(`Error starting NTP server: ${err}`);
        app.setPluginError(`Error starting NTP server: ${err}`);
        return;
      }

      app.setPluginStatus(`NTP server listening on port ${options.port}`);
    });

    plugin.onStop.push(() => {
      plugin.server.socket.close();
      plugin.server = null;
    });

    plugin.onStop.push(app.streambundle.getSelfBus(options.sourcePath).forEach(datetime => {
      plugin.datetime = datetime;
      // Take the current time as reference of the last update
      plugin.datetime.timestamp = new Date().toISOString();
    }));
  };

  plugin.stop = function () {
    plugin.onStop.forEach(f => f());
    plugin.onStop = [];

    app.debug('Plugin stopped');
  };

  return plugin;
};
