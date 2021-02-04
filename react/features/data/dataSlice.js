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

export const fetchData = createAsyncThunk('data/fetchData', async (url, { rejectWithValue }) => {
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

export const writeData = createAsyncThunk('data/writeData', async (url, { rejectWithValue }) => {
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

export const dataSlice = createSlice({
    name: 'data',
    initialState: {
	data: null,
	status: 'idle',
	write_status: 'idle',
	write_result: null,
	error: null,
	filters: {
	    alive: 'all', // 'all', 'alive', 'dead' or 'unknown'
	    sex: 'all', // 'all', 'female' or 'male'
	    array: 'all', // 'all', 'finngen' or 'legacy'
	    impchip: 'all', // 'all', 'imp' or 'chip'
	    gtgp: 'gt', // 'gt' or 'gp'
	    gpThres: 0.95 // if you change this, change also in VariantForm to allow caching
	},
	options: {
	    bbreg: 'biobank', // 'biobank' or 'region'
	    cntfreq: 'gt_count' // 'gt_count', 'indiv_count' or 'freq'
	},
	serverOptions: {
	    hethom: false // whether to count individuals heterozygous for more than one variant as homozygous
	}
    },
    reducers: {
	setData: (state, action) => {
	    state.data = action.payload
	    state.write_status = 'idle'
	    state.write_result = null
	},
	setFilter: (state, action) => {
	    if (action.payload.filt == 'gtgp') {
		state.filters['gtgp'] = action.payload.content.type
		state.filters['gpThres'] = action.payload.content.gpThres
	    } else {
		state.filters[action.payload.filt] = action.payload.content
	    }
	},
	setOption: (state, action) => {
	    state.options[action.payload.opt] = action.payload.content
	},
	setServerOption: (state, action) => {
	    state.serverOptions[action.payload.opt] = action.payload.content
	}
    },
    extraReducers: {
	// automatically called by asyncthunks
	[fetchData.pending]: (state, action) => {
	    state.status = 'loading'
	},
	[fetchData.fulfilled]: (state, action) => {
	    state.status = 'done'
	    state.variants = action.payload.variants
	    state.annotation = action.payload.annotation
	    state.data = action.payload.data
	    state.time = action.payload.time
	    console.log(action.payload)
	    const ordered = {}
	    Object.keys(action.payload.data.filters).sort().forEach(key => { ordered[key] = action.payload.data.filters[key] })
	    try {
		sessionStorage.setItem(`${action.payload.variants.join(',')}+${JSON.stringify(ordered)}+${action.payload.data_type}`, JSON.stringify(action.payload.data))
	    } catch(e) {
		if (isQuotaExceeded(e)) {
		    console.warn('sessionstorage quota exceeded')
		    //sessionStorage.clear()
		} else {
		    alert(e)
		}
	    }
	    //console.log(`${action.payload.variants.join(',')}+${JSON.stringify(ordered)}`)
	},
	[fetchData.rejected]: (state, action) => {
	    state.status = 'failed'
	    state.error = action.payload
	},
	[writeData.pending]: (state, action) => {
	    state.write_status = 'writing'
	},
	[writeData.fulfilled]: (state, action) => {
	    state.write_status = 'done'
	    state.write_result = action.payload
	},
	[writeData.rejected]: (state, action) => {
	    state.write_status = 'failed'
	    state.error = action.payload
	}
    }
})

export const { setFilter, setOption, setServerOption, setData } = dataSlice.actions
export const gtCount = state => (state.data.data && [state.data.data.het[0].length, state.data.data.hom_alt[0].length])

export default dataSlice.reducer
