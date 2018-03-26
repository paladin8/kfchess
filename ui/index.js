import amplitude from 'amplitude-js';
import React from 'react';
import ReactDOM from 'react-dom';
import ReactModal from 'react-modal';

import App from './containers/App';

import 'react-tippy/dist/tippy.css';
import './styles/index.less';

amplitude.getInstance().init(AMPLITUDE_API_KEY, null, {
    includeReferrer: true,
});

ReactDOM.render(<App />, document.getElementById('app'));

ReactModal.setAppElement('#app');
ReactModal.defaultStyles.overlay.backgroundColor = 0x000000;
