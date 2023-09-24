/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, TrafficLayer, TransitLayer, MarkerF } from '@react-google-maps/api';
import { useAppSelector, useAppDispatch } from '../redux/store';

interface MapProps{
  showTraffic: boolean;
  showTransit: boolean;
  setPlaceInfo: React.Dispatch<React.SetStateAction<google.maps.places.PlaceResult | null>>;
}

const MapComponent = (props: MapProps) => {
  const dispatch = useAppDispatch();
  const selectedLatLng = useAppSelector((state) => state.selectedLatLng);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLng>(null);
  
  const placesService = useMemo(() => {
    if(map) return new google.maps.places.PlacesService(map)
    else return null;
  }, [map]);

  useEffect(() => {
    //직렬화된 데이터를 google.maps.LatLng 로 변환
    if(selectedLatLng){
      let pos = new google.maps.LatLng(selectedLatLng.lat, selectedLatLng.lng);
      setCurrentPosition(pos);
    }
  }, [selectedLatLng]);

  const onClickMap = (e: google.maps.MapMouseEvent) => {
    e.stop();
    let _id = (e as any).placeId;
    if(map instanceof google.maps.Map && _id && placesService){
      let request = {
        placeId: _id,
        fields: [
          'place_id',
          'adr_address',
          'vicinity',
          'icon',
          'icon_background_color',
          'name',
          'opening_hours',
          'photo',
          'rating',
          'user_ratings_total',
          'reviews',
          'types',
          'website',
          'geometry'
        ]
      } as google.maps.places.PlaceDetailsRequest;

      placesService.getDetails(request, (place: any, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          props.setPlaceInfo(place);
        }
      });
    }
  }

  return (
    <GoogleMap mapContainerStyle={{ width: '100%', height: '100vh' }}
               center={currentPosition}
               zoom={12}
               clickableIcons={true}
               options={{ disableDefaultUI : true }}
               onClick={onClickMap}
               onLoad={setMap}
               onUnmount={() => {setMap(null)}}>
      { props.showTraffic && <TrafficLayer/> }
      { props.showTransit && <TransitLayer/> }
      <MarkerF position={currentPosition}/>
    </GoogleMap>
  );
};

export default MapComponent;
