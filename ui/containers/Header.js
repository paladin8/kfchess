import React, { Component } from 'react';
import { Link } from 'react-router-dom';

export default class Header extends Component {

    render() {
        return (
            <div className='header'>
                <div className='header-logo'>
                    <div className='header-logo-img'>
                        <img src='/static/logo.png' />
                    </div>
                    <div className='header-logo-text'>
                        Kung Fu Chess <sup>Alpha</sup>
                    </div>
                </div>
                <div className='header-menu'>
                    <div className='header-menu-item'>
                        <Link to='/'>Home</Link>
                    </div>
                    <div className='header-menu-item'>
                        <a href='https://www.reddit.com/r/kfchess/'>Reddit</a>
                    </div>
                    <div className='header-menu-item'>
                        <Link to='/about'>About</Link>
                    </div>
                </div>
            </div>
        );
    }
};
