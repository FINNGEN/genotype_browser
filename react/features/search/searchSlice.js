import { createSlice, createAsyncThunk, createAction } from '@reduxjs/toolkit'

export const search = createAsyncThunk('search/search', async (url, { rejectWithValue }) => {
    try {
	const response = await fetch(url)
	if (response.status == 200) {
	    return response.json()
	} else {
	    return rejectWithValue({status: response.status, message: response.statusText})
	}
    } catch (error) {
	return rejectWithValue({status: response.status, message: response.statusText})
    }
})


export const reset = createAction('REVERT_ALL');
const initialState = {
	status: 'idle',
	result: {}
};

export const searchSlice = createSlice({
    name: 'search',
    initialState: initialState,
    reducers: {
	setResult: (state, action) => {
	    state.result = action.payload
	},
	resetSearch: () => initialState
    },
    extraReducers: {
	// automatically called by asyncthunks
	[search.pending]: (state, action) => {
	    state.status = 'loading'
	    state.error = null
	    state.result = {}
	},
	[search.fulfilled]: (state, action) => {
	    state.status = 'done'
	    state.result = action.payload
	    state.error = null
	},
	[search.rejected]: (state, action) => {
	    state.status = 'failed'
	    state.error = action.payload
	    // console.log("searchSlice.js state.error:", action.payload)
	    state.result = {}
	}
    }
})

export const { setResult, resetSearch } = searchSlice.actions

export default searchSlice.reducer
