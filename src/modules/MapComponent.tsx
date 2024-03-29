/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, TrafficLayer, TransitLayer, MarkerF, DirectionsRenderer } from '@react-google-maps/api';
import { useAppSelector } from '../redux/store';
import { Travel, TravelSerialized, deSerializeTravel } from '../DataType/Travel';
import { Place } from '../DataType/Place';

interface MapProps{
  //from Main
  showTraffic: boolean;
  showTransit: boolean;
  //from LocationSearcher
  placeResult: google.maps.places.PlaceResult | null;
  setPlaceResult: React.Dispatch<React.SetStateAction<google.maps.places.PlaceResult | null>>;
  //from TravelInfoPanel
  placeId: string;
  directions: google.maps.DirectionsResult[];
  markerPlaces: Place[];
}

interface AugRenderer{
  direction: google.maps.DirectionsResult;
  options: google.maps.DirectionsRendererOptions
}

const MapComponent = (props: MapProps) => {
  const travelListRedux: TravelSerialized[] = useAppSelector(state => state.travelList.list);
  const selectedIdxRedux = useAppSelector(state => state.travelList.selectedIdx);
  const selectedLatLng = useAppSelector((state) => state.selectedLatLng);
  const [selectedTravel, setSelectedTravel] = useState<Travel>(null);
  const [prevTravelId, setPrevTravelId] = useState('');

  const highContrastColors = [
    '#E11845', //빨강
    '#FF5733', //주황
    '#FFDD33', //노랑
    '#043927', //초록
    '#0057E9', //파랑
    '#000080', //남색
    '#8931EF', //보라
    '#FF00BD', //핑크
  ];

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(12);
  const [showCurrentMarker, setShowCurrentMarker] = useState(true);
  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLng>(null);
  const [augDirections, setAugDirections] = useState<AugRenderer[]>([]);

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
    }
  }, [selectedLatLng]);

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
        drawPlacesAndZoom(list);
        setPrevTravelId(selectedTravel.id);
      }
    } else {
      setPrevTravelId('');
    }
  }, [selectedTravel]);

  useEffect(() => {
    if(props.markerPlaces.length > 0){
      drawPlacesAndZoom(props.markerPlaces);
    }
  }, [props.markerPlaces]);

  useEffect(() => {
    setAugDirections(props.directions.map((x, i) => {
      const polyOpt = {
        strokeColor: highContrastColors[i % highContrastColors.length],
        strokeWeight: 10,
        strokeOpacity: 0.45
      } as google.maps.PolylineOptions;
      return {
        direction: x,
        options: { polylineOptions: polyOpt } as google.maps.DirectionsRendererOptions 
      } as AugRenderer;     
    }));
  }, [props.directions]);

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
          'geometry',
          'utc_offset_minutes'
        ]
      } as google.maps.places.PlaceDetailsRequest;

      placesService.getDetails(request, (place: google.maps.places.PlaceResult, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          props.setPlaceResult(place);
          setShowCurrentMarker(true);
          const pos = new google.maps.LatLng(place.geometry.location.lat(), place.geometry.location.lng());
          setCurrentPosition(pos);

          setZoom(map.getZoom());
          setTimeout(() => setZoom(18), 50);          
        }
      });
    }
  }

  const drawPlacesAndZoom = (list: Place[]) => {
    const bounds = new google.maps.LatLngBounds();
    list.forEach(c => {
      bounds.extend(new window.google.maps.LatLng(c.latLng.lat, c.latLng.lng));
    });
    
    map.fitBounds(bounds);
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
        { augDirections.map((d, i) => (<DirectionsRenderer directions={d.direction} options={d.options}/>)) }
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
