import React, { useState } from 'react';
import './custom.css'
import Login from './Login';
import MapComponent from './MapComponent';
import Menu from './Menu';
import LocationSearcher from './LocationSearcher';

const Main = () => {
  const [showTraffic, setShowTraffic] = useState<boolean>(false);
  const [showTransit, setShowTransit] = useState<boolean>(false);
  const [selectedLatitude, setSelectedLatitude] = useState<number | null>(null);
  const [selectedLongitude, setSelectedLongitude] = useState<number | null>(null);

  return(
    <div>
      <div className='Header d-flex gap-2 justify-content-between align-items-center'>
        <Menu
          showTraffic={showTraffic}
          showTransit={showTransit}
          setShowTraffic={setShowTraffic}
          setShowTransit={setShowTransit}
        />
        <LocationSearcher
          setSelectedLatitude={setSelectedLatitude}
          setSelectedLongitude={setSelectedLongitude}
        />
        <Login/>
      </div>
    
      <MapComponent
        showTraffic={showTraffic}
        showTransit={showTransit}
        selectedLatitude={selectedLatitude}
        selectedLongitude={selectedLongitude}
      />
    </div>
  )
}

export default Main;