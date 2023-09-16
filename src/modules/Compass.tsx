import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import { useAppDispatch } from '../redux/store';
import { setCurrentLatLng } from '../redux/selectedLatLngSlice';

const Compass = () => {
  const dispatch = useAppDispatch();

  const getCurrentPos = () => {
    dispatch(setCurrentLatLng());
  }

  return (    
    <button className='CompassButton' onClick={getCurrentPos}>
      <ExploreOutlinedIcon style={{ fontSize: '64px' }}/>
    </button>
  )
}

export default Compass;