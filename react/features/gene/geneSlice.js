import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const fetchData = createAsyncThunk('gene/fetchData', async (url, { rejectWithValue }) => {
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

export const geneSlice = createSlice({
    name: 'gene',
    initialState: {
	gene: null,
	status: 'idle',
	error: null
    },
    reducers: {
	setData: (state, action) => {
	    //console.log('setting data')
	    state.data = action.payload.data
	    state.gene = action.payload.gene
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
	    state.gene = action.payload.gene
	    state.columns = action.payload.columns
	    sessionStorage.setItem(`${action.payload.gene}_${action.payload.gene.data_type}`, JSON.stringify(action.payload))
	},
	[fetchData.rejected]: (state, action) => {
	    state.status = 'failed'
	    state.error = action.payload
	}
    }
})

export const { setData } = geneSlice.actions

export default geneSlice.reducer
