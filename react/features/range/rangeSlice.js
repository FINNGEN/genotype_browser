import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const fetchData = createAsyncThunk('range/fetchData', async (url, { rejectWithValue }) => {
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

export const rangeSlice = createSlice({
    name: 'range',
    initialState: {
	range: null,
	status: 'idle',
	error: null
    },
    reducers: {
	setData: (state, action) => {
	    state.data = action.payload.data
	    state.range = action.payload.range
	    state.columns = action.payload.columns
	}
    },
    extraReducers: {
	// automatically called by asyncthunks
	[fetchData.pending]: (state, action) => {
	    state.status = 'loading'
	},
	[fetchData.fulfilled]: (state, action) => {
	    state.status = 'done'
	    state.data = action.payload.data
	    state.range = action.payload.range
	    state.columns = action.payload.columns
	    sessionStorage.setItem(`${action.payload.range}`, JSON.stringify(action.payload))
	},
	[fetchData.rejected]: (state, action) => {
	    state.status = 'failed'
	    state.error = action.payload
	}
    }
})

export const { setData } = rangeSlice.actions

export default rangeSlice.reducer
