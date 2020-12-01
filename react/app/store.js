import { getDefaultMiddleware } from '@reduxjs/toolkit'
import { configureStore } from '@reduxjs/toolkit'
import dataReducer from '../features/data/dataSlice'
import geneReducer from '../features/gene/geneSlice'
import searchReducer from '../features/search/searchSlice'

export default configureStore({
    reducer: { 
	data: dataReducer,
	gene: geneReducer,
	search: searchReducer
    },
    middleware: [...getDefaultMiddleware({immutableCheck: false, serializableCheck: false})]
})
