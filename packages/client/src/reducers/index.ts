import { combineReducers } from 'redux';
import login from './login.reducer';
const globalReducers = combineReducers({
    login,
});
export default globalReducers;
