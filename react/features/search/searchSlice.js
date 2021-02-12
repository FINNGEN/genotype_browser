import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

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

export const searchSlice = createSlice({
    name: 'search',
    initialState: {
	status: 'idle',
	result: {},
	data_type: 'imputed'
    },
    reducers: {
	setResult: (state, action) => {
	    state.result = action.payload
	},
	setDataType: (state, action) => {
	    state.data_type = action.payload.content
	}
    },
    extraReducers: {
	// automatically called by asyncthunks
	[search.pending]: (state, action) => {
	    state.status = 'loading'
	    state.error = null
	},
	[search.fulfilled]: (state, action) => {
	    state.status = 'done'
	    state.result = action.payload
	    state.error = null
	},
	[search.rejected]: (state, action) => {
	    state.status = 'failed'
	    state.error = action.payload
	}
    }
})

export const { setResult, setDataType } = searchSlice.actions

export default searchSlice.reducer
