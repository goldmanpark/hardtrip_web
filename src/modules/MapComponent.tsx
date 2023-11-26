/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, TrafficLayer, TransitLayer, MarkerF, DirectionsRenderer } from '@react-google-maps/api';
import { useAppSelector, useAppDispatch } from '../redux/store';

import { CompareDate } from './CommonFunctions';
import { Travel, TravelSerialized, deSerializeTravel } from '../DataType/Travel';
import { Place } from '../DataType/Place';

interface MapProps{
  //from Main
  showTraffic: boolean;
  showTransit: boolean;
  //from LocationSearcher
  placeInfo: google.maps.places.PlaceResult | null;  
  setPlaceResult: React.Dispatch<React.SetStateAction<google.maps.places.PlaceResult | null>>;
  //from TravelInfoPanel
  placeId: string;
  directions: google.maps.DirectionsResult[];
  markerPlaces: Place[];
}

const MapComponent = (props: MapProps) => {
  const dispatch = useAppDispatch();
  const travelListRedux: TravelSerialized[] = useAppSelector(state => state.travelList.list);
  const selectedIdxRedux = useAppSelector(state => state.travelList.selectedIdx);
  const selectedLatLng = useAppSelector((state) => state.selectedLatLng);
  const [selectedTravel, setSelectedTravel] = useState<Travel>(null);
  const [prevTravelId, setPrevTravelId] = useState('');

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(12);
  const [showCurrentMarker, setShowCurrentMarker] = useState(true);
  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLng>(null);
  const [placeInfo, setPlaceInfo] = useState<google.maps.places.PlaceResult | null>(null);
  
  const placesService = useMemo(() => {
    if(map) return new google.maps.places.PlacesService(map)
    else return null;
  }, [map]);

  useEffect(() => {
    //직렬화된 데이터를 google.maps.LatLng 로 변환
    if(selectedLatLng){
      let pos = new google.maps.LatLng(selectedLatLng.lat, selectedLatLng.lng);
      setCurrentPosition(pos);
      setShowCurrentMarker(true);
      props.setPlaceResult(null);
    }
  }, [selectedLatLng]);

  useEffect(() => {
    if(props.placeInfo){
      setPlaceInfo(props.placeInfo)
    }
  }, [props.placeInfo]);

  useEffect(() => {
    if(props.placeId !== ''){
      getPlaceResult(props.placeId);
    }
  }, [props.placeId]);

  useEffect(() => {
    if(travelListRedux.length > 0 && selectedIdxRedux >= 0){
      setSelectedTravel(deSerializeTravel(travelListRedux[selectedIdxRedux]));      
    } else {
      setSelectedTravel(null);
    }
  }, [travelListRedux, selectedIdxRedux]);

  useEffect(() => {
    if(selectedTravel){      
      const list = selectedTravel.places;
      if(!(list instanceof Array) || list.length === 0){
        return;
      }

      setShowCurrentMarker(false);
      if(prevTravelId !== selectedTravel.id){
        //새로운 travel선택시 화면이동
        let maxLat = 0, minLat = 0, avgLat = 0;
        let maxLng = 0, minLng = 0, avgLng = 0;
        list.forEach(x => {
          const ll = x.latLng;
          avgLat += ll.lat;
          avgLng += ll.lng;
          if(ll.lat > maxLat)
          maxLat = ll.lat > maxLat ? ll.lat : maxLat;
          minLat = ll.lat < minLat ? ll.lat : minLat;
          maxLng = ll.lng > maxLng ? ll.lng : maxLng;
          minLng = ll.lng < minLng ? ll.lng : minLng;
        });
        avgLat /= list.length;
        avgLng /= list.length;
        setCurrentPosition(new google.maps.LatLng(avgLat, avgLng));        
        
        const lat = maxLat - minLat;
        const lng = maxLng - minLng;
        const z = Math.round((lat > lng ? lat : lng) / 15)
        setZoom(z);
        setPrevTravelId(selectedTravel.id);
      }
    } else {
      setPrevTravelId('');
    }
  }, [selectedTravel]);

  const getPlaceResult = (placeId: string) => {
    if(map instanceof google.maps.Map && placeId && placesService){
      let request = {
        placeId: placeId,
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
  
      placesService.getDetails(request, (place: google.maps.places.PlaceResult, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          setPlaceInfo(place);
          props.setPlaceResult(place);
          //setShowCurrentMarker(true);
          const pos = new google.maps.LatLng(place.geometry.location.lat(), place.geometry.location.lng());
          setCurrentPosition(pos);
          setZoom(12);
        }
      });
    }    
  }

  const onClickMap = (e: google.maps.MapMouseEvent) => {
    e.stop();
    let _id = (e as any).placeId;
    if(_id){
      getPlaceResult(_id);
    }
  }

  return (
    <React.Fragment>
      <GoogleMap mapContainerStyle={{ width: '100%', height: '100vh' }}
                center={currentPosition}
                zoom={zoom}
                clickableIcons={true}
                options={{ disableDefaultUI : true, gestureHandling : 'greedy' }}
                onClick={onClickMap}
                onLoad={setMap}
                onUnmount={() => {setMap(null)}}>
        { props.showTraffic && <TrafficLayer/> }
        { props.showTransit && <TransitLayer/> }
        { props.directions.map(d => (<DirectionsRenderer directions={d}/>)) }
        { showCurrentMarker && <MarkerF position={currentPosition}/> }
        { props.markerPlaces.map((p, i) => {
          const label = {
            text: (i + 1).toString(),
            fontWeight: 'bold'
          } as google.maps.MarkerLabel;
          return <MarkerF position={p.latLng} label={label}/>
        }) }
      </GoogleMap>
    </React.Fragment>
  );
};

export default MapComponent;
