const WHATS_NEW = [
  {
    type: 'signalk-server-node',
    title: 'Resource Panel',
    message: `
        New resource information panel display available on 
        larger screen devices that provides access to operations,
        related items and support for markdown formatting in
        resource descriptions.
        <br>&nbsp;<br>
        Supports Route, Waypoint, Note and Region resource types.
      `
  }
];

export const WELCOME_MESSAGES = {
  welcome: {
    title: 'Welcome to Open Binnacle',
    message: `Open Binnacle is your Signal K chartplotter WebApp from which
                  you can manage routes, waypoints, notes, alarms,
                  notifications, and more.`
  },
  'signalk-server-node': {
    title: 'Server Plugins',
    message: `Some Open Binnacle features require that certain plugins are installed to service the
                  required Signal K API paths.
                  <br>&nbsp;<br>
                  See <a href="assets/help/index.html" target="help">HELP</a>
                  for more details.`
  },
  'whats-new': WHATS_NEW
};
