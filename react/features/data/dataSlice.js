import { createSlice, createAsyncThunk, createAction } from '@reduxjs/toolkit'

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

export const reset = createAction('REVERT_ALL');
const initialState = {
	data: null,
	status: 'idle',
	write_status: 'idle',
	write_result: null,
	error: null,
	data_type: 'imputed',
	filters: {
	    alive: 'all', // 'all', 'alive', 'dead' or 'unknown'
	    sex: 'all', // 'all', 'female' or 'male'
	    array: 'all', // 'all', 'finngen' or 'legacy'
	    impchip: 'all', // 'all', 'imp' or 'chip'
	    gtgp: 'gt', // 'gt' or 'gp'
	    gpThres: 0.95 // if you change this, change also in VariantForm to allow caching
	},
	options: {
	    bbreg: 'region', // 'biobank' or 'region'
	    cntfreq: 'freq', // 'gt_count', 'indiv_count' or 'freq'
	    barmap: 'map', // 'bar' or 'map'
	    maphethom: 'het' // 'het' or 'hom'
	},
	downloadOptions : {
		// het', 'hom', 'wt_hom', 'missing': specify individuals with which type of variant should be downloaded
		'het': true, 
		'hom': true, 
		'wt_hom': true, 
		'missing': true
	},
	serverOptions: {
	    hethom: false // whether to count individuals heterozygous for more than one variant as homozygous
	}
}

export const dataSlice = createSlice({
    name: 'data',
    initialState: initialState,
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
			// console.log("dataSlice: action.payload.opt:", action.payload.opt, "action.payload.content:", action.payload.opt)
	    state.options[action.payload.opt] = action.payload.content
	},
	setDownloadOption: (state, action) => {
	    state.downloadOptions[action.payload.opt] = action.payload.content
	},
	setServerOption: (state, action) => {
	    state.serverOptions[action.payload.opt] = action.payload.content
	},
	setDataType: (state, action) => {
	    state.data_type = action.payload.content
	},
	resetData: () => initialState
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
	    state.data_freeze =`[${action.payload.release_version}]` 
	    state.geo_data = action.payload.geo_data['features']
		state.data_type = action.payload.data_type
		state.dtype_src = action.payload.dtype_src

	    const ordered = {}
	    Object.keys(action.payload.data.filters).sort().forEach(key => { ordered[key] = action.payload.data.filters[key] })
		try {
			sessionStorage.setItem(`${action.payload.variants.join(',')}+${JSON.stringify(ordered)}+${action.payload.data_type}`, JSON.stringify(action.payload.data))
		} catch(e) {
			if (isQuotaExceeded(e)) {
				console.warn('sessionstorage quota exceeded (dataSlice), clear the storage!')
				sessionStorage.clear()
			} else {
				alert(e)
			}
		}		
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

export const { setFilter, setOption, setServerOption, setData, setDataType, setDownloadOption, resetData } = dataSlice.actions
export const gtCount = state => (state.data.data && [state.data.data.het[0].length, 
		state.data.data.hom_alt[0].length, state.data.data.wt_hom[0].length, 
		state.data.data.missing[0].length, state.data.data.qcd[0].length])

export default dataSlice.reducer
