import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// http://crocodillon.com/blog/always-catch-localstorage-security-and-quota-exceeded-errors
function isQuotaExceeded(e) {
  var quotaExceeded = false;
  if (e) {
    if (e.code) {
      switch (e.code) {
        case 22:
          quotaExceeded = true;
          break;
        case 1014:
          // Firefox
          if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            quotaExceeded = true;
          }
          break;
      }
    } else if (e.number === -2147024882) {
      // Internet Explorer 8
      quotaExceeded = true;
    }
  }
  return quotaExceeded;
}

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
	    // sessionStorage.setItem(`${action.payload.range}_${action.payload.range.data_type}`, JSON.stringify(action.payload))
	    if (action.payload.data.length < 5000){
	    	try {
				sessionStorage.setItem(`, ${action.payload.range}_${action.payload.data_type}`, JSON.stringify(action.payload))
			    } catch(e) {
				if (isQuotaExceeded(e)) {
				    console.warn('sessionstorage quota exceeded, clear storage!')
				    sessionStorage.clear()
				} else {
				    alert(e)
				}
			}
	    }
	},
	[fetchData.rejected]: (state, action) => {
	    state.status = 'failed'
	    state.error = action.payload
	}
    }
})

export const { setData } = rangeSlice.actions

export default rangeSlice.reducer
