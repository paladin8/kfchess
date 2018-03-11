import React from 'react';
import ReactDOM from 'react-dom';
import ReactModal from 'react-modal';

import App from './containers/App';

require('./styles/index.less');

ReactModal.setAppElement('#app');
ReactModal.defaultStyles.overlay.backgroundColor = 0x000000;

ReactDOM.render(<App />, document.getElementById('app'));
