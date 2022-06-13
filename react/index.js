import React from 'react'
import ReactDOM from 'react-dom'
import {
    BrowserRouter,
    Route,
    Switch,
    Link
} from 'react-router-dom'
import { Provider } from 'react-redux'

import store from './app/store'
import { SearchForm } from './features/search/SearchForm'
import { SearchExamples } from './features/search/SearchExamples'
import { VariantContainer } from './features/variant/VariantContainer'
import { Variants } from './features/variants/Variants'
import { Gene } from './features/gene/Gene'
import { Range } from './features/range/Range'


ReactDOM.render(
        <Provider store={store}>
        <BrowserRouter>
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
        <div style={{flex: 1, height: '100%', padding: '10px', display: 'flex', flexFlow: 'row nowrap', justifyContent: 'flex-start', flexDirection: 'column'}}>
	<Link to='/' style={{paddingBottom: '10px', textDecoration: 'none', color: 'black', width: '200px'}}>genotype browser</Link>
	<Route path='/' component={SearchForm}/>
	<Route exact path='/' component={SearchExamples}/>
	<Route path='/variant/:variant' component={VariantContainer}/>
    <Route path='/variants/:variants/:data_type' component={Variants}/>
	<Route path='/gene/:gene' component={Gene}/>
    <Route path='/range/:range' component={Range}/>
        </div>
        </div>
        </BrowserRouter>
        </Provider>
    , document.getElementById('reactEntry'))
