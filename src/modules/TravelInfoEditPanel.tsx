/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useContext } from 'react';
import { useAppSelector, useAppDispatch } from '../redux/store';
import { Card, Table, Accordion, Dropdown } from 'react-bootstrap';
import AccordionContext from 'react-bootstrap/AccordionContext';
import { useAccordionButton } from 'react-bootstrap/AccordionButton';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';
import { Travel, TravelSerialized, deSerializeTravel } from '../DataType/Travel';
import { Place } from '../DataType/Place';
import { Route } from '../DataType/Route';
import { updatePlaceList, deletePlaceList, setSelectedIdx } from '../redux/travelListSlice';
import { CompareDate, GetDaysDiff, isSameDate } from './CommonFunctions';

import GetPlaceIcon from '../DataType/GetPlaceIcon';
import DatePicker from 'react-datepicker';
import DeleteIcon from '@mui/icons-material/Delete';
import DoDisturbIcon from '@mui/icons-material/DoDisturb';
import CheckIcon from '@mui/icons-material/Check';
import RouteIcon from '@mui/icons-material/Route';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PlaceIcon from '@mui/icons-material/Place';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DirectionsTransitIcon from '@mui/icons-material/DirectionsTransit';
import PedalBikeIcon from '@mui/icons-material/PedalBike';
import DriveEtaIcon from '@mui/icons-material/DriveEta';

interface TravelInfoProps{
  //to MapComponent
  setPlaceId: React.Dispatch<React.SetStateAction<string>>;
  setMarkerPlaces: React.Dispatch<React.SetStateAction<Place[]>>
  setDirections: React.Dispatch<React.SetStateAction<google.maps.DirectionsResult[]>>;
  //to RouteEditPanel
  setFrom: React.Dispatch<React.SetStateAction<Place>>;
  setTo: React.Dispatch<React.SetStateAction<Place>>;
  onClose: () => void;
}

interface TravelDay{
  day: number;
  date: Date | string;
}

interface PlaceEdit extends Place{
  isDel: boolean;
  isEdit: boolean;
}

const TravelInfoEditPanel = (props : TravelInfoProps) => {
  const dispatch = useAppDispatch();
  const travelListRedux: TravelSerialized[] = useAppSelector(state => state.travelList.list);
  const selectedIdxRedux = useAppSelector(state => state.travelList.selectedIdx);
  const directionsService = new google.maps.DirectionsService();
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  const [selectedTravel, setSelectedTravel] = useState<Travel>(null);
  const [travelDays, setTravelDays] = useState<TravelDay[]>([]);
  const [orderedPlaceArray, setOrderedPlaceArray] = useState<PlaceEdit[]>([]);
  const [orderedPlaceMatrix, setOrderedPlaceMatrix] = useState<PlaceEdit[][]>([[]]);
  const [routeList, setRouteList] = useState<Route[]>([]);

  //#region [useEffect]
  useEffect(() => {
    return () => {
      //props해제
      props.setDirections([]);
      props.setPlaceId('')
    }
  }, []);

  useEffect(() => {
    if(travelListRedux.length > 0 && selectedIdxRedux >= 0){
      setSelectedTravel(deSerializeTravel(travelListRedux[selectedIdxRedux]));
    } else {
      setSelectedTravel(null);
    }
  }, [travelListRedux, selectedIdxRedux]);

  useEffect(() => {
    if(selectedTravel){
      //1. travelDays생성
      const startDate = selectedTravel.startDate;
      const endDate = selectedTravel.endDate;
      const tempTravelDays = [];
      const tempPlaceList = [[]];

      if(startDate instanceof Date && endDate instanceof Date){
        const days = GetDaysDiff(endDate, startDate) + 1;

        for(let i = 0 ; i < days ; i++){
          const newDate = new Date(startDate);
          newDate.setDate(newDate.getDate() + (i * 1));
          tempTravelDays.push({
            day: i + 1,
            date: newDate
          } as TravelDay);
          tempPlaceList.push([]);
        }
      }
      tempTravelDays.unshift({ date: 'N/A', day: 0 } as TravelDay);
      setTravelDays(tempTravelDays);

      const temp = selectedTravel.places.map(x => ({...x, isDel: false, isEdit: false} as PlaceEdit))
      temp.sort((x, y) => CompareDate(x.startDTTM, y.startDTTM));
      temp.forEach(x => {
        tempPlaceList[x.day].push(x);
      });

      setOrderedPlaceMatrix(tempPlaceList);
    } else {
      setTravelDays([{ date: 'N/A', day: 0 } as TravelDay]);
      setOrderedPlaceMatrix([[]]);
    }
  }, [selectedTravel]);

  useEffect(() => {
    //1. 1차원 배열 재설정
    setOrderedPlaceArray(orderedPlaceMatrix.reduce((acc, cur) => acc.concat(cur), []));

    //2. routeList 재설정
    const data = [];
    for(let i = 0 ; i < orderedPlaceMatrix.length ; i++){
      for(let j = 1 ; j < orderedPlaceMatrix[i].length ; j++){
        const from = orderedPlaceMatrix[i][j - 1];
        const to = orderedPlaceMatrix[i][j];
        const route = routeList.find(x => x.sourceId === from.id && x.destinationId === to.id);
        if(route){
          data.push(route);
        }
      }
    }
    setRouteList(data);
  }, [orderedPlaceMatrix]);
  //#endregion

  //#region [Functions]
  const haversineDistance = (from: google.maps.LatLngLiteral, to: google.maps.LatLngLiteral): number => {
    const R = 6371; //km
    const dLat = (to.lat - from.lat) * (Math.PI / 180);
    const dLng = (to.lng - from.lng) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; //km
  }

  const setRoute = (source: PlaceEdit, destination: PlaceEdit, result: google.maps.DirectionsResult, mode: google.maps.TravelMode) => {
    const route = routeList.find(x => x.sourceId === source.id && x.destinationId === destination.id);
    const resultRoute = result.routes[0];
    const newRoute = {
      sourceId: source.id,
      destinationId: destination.id,
      sourcePlaceId: source.place_id,
      destinationPlaceId: destination.place_id,
      travelMode: mode,
      distance: resultRoute.legs[0].distance.value,
      duration: resultRoute.legs[0].duration.value,
      fare: resultRoute.fare?.value,
      currency: resultRoute.fare?.currency
    } as Route;
    if(route){
      setRouteList(prev => prev.map(x => x.sourceId === route.sourceId && x.destinationId === route.destinationId ? newRoute : x));
    } else {
      setRouteList(prev => [...prev, newRoute]);
    }
  }
  //#endregion

  //#region [Event Handler]
  const confirmEdit = () => {
    if(orderedPlaceArray.find(x => x.isDel)){
      dispatch(deletePlaceList({travelId: selectedTravel.id, placeList: orderedPlaceArray.filter(x => x.isDel)}));
    }
    if(orderedPlaceArray.find(x => x.isEdit)){
      dispatch(updatePlaceList({travelId: selectedTravel.id, placeList: orderedPlaceArray.filter(x => x.isEdit)}));
    }
  }

  const closeTravel = () => {
    dispatch(setSelectedIdx(-1));
    props.onClose();
  }
  //#endregion

  //#region [Droppable Event Handler]
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if(!destination) return;

    const reorderedData = [...orderedPlaceMatrix];
    const [removed] = reorderedData[source.droppableId].splice(source.index, 1);
    const sourceDropID = parseInt(source.droppableId);
    const destDropID = parseInt(destination.droppableId);

    if(sourceDropID === destDropID){
      reorderedData[sourceDropID].splice(destination.index, 0, removed);
      setOrderedPlaceMatrix(reorderedData);
    } else {
      removed.day = destDropID;
      removed.isEdit = true;
      reorderedData[destDropID].splice(destination.index, 0, removed);
      setOrderedPlaceMatrix(reorderedData);
    }
  }

  const drawDailyMarkers = (day?: number) => {
    if(day){
      props.setMarkerPlaces(orderedPlaceMatrix[day]);
    } else {
      props.setMarkerPlaces(orderedPlaceArray);
    }
  }

  const searchDailyRoute = async (day: number) => {
    const target = orderedPlaceArray.filter(x => x.day === day);
    const directionList = [];
    for(let i = 0 ; i < target.length - 1 ; i++){
      const mode = haversineDistance(target[i].latLng, target[i + 1].latLng) >= 1.5
        ? google.maps.TravelMode.TRANSIT
        : google.maps.TravelMode.WALKING;
      const req = {
        origin: { placeId: target[i].place_id } as google.maps.Place,
        destination: { placeId: target[i + 1].place_id } as google.maps.Place,
        travelMode: mode
      } as google.maps.DirectionsRequest;

      await directionsService.route(req, async (result, status) => {
        if(status === google.maps.DirectionsStatus.OK){
          setRoute(target[i], target[i + 1], result, mode);
          directionList.push(result);
        } else {
          console.error(result);
        }
      });
    }
    props.setDirections(directionList);
  }
  //#endregion

  //#region [Draggable Event Handler]
  const removePlace = (place: PlaceEdit) => {
    const data = [...orderedPlaceMatrix];
    loop: for(let i = 0 ; i < data.length ; i++){
      for(let j = 0 ; j < data[i].length ; j++){
        if(data[i][j].id === place.id){
          data[i][j].isDel = true;
          break loop;
        }
      }
    }
    setOrderedPlaceMatrix(data);
  }

  const cancelRemove = (place: PlaceEdit) => {
    const data = [...orderedPlaceMatrix];
    loop: for(let i = 0 ; i < data.length ; i++){
      for(let j = 0 ; j < data[i].length ; j++){
        if(data[i][j].id === place.id){
          data[i][j].isDel = false;
          break loop;
        }
      }
    }
    setOrderedPlaceMatrix(data);
  }

  const updateStartDTTM = (placeId: string, newDate: Date) => {
    const data = [...orderedPlaceMatrix];
    let day = 0;
    let order = 0;
    loop: for(let i = 0 ; i < data.length ; i++){
      for(let j = 0 ; j < data[i].length ; j++){
        if(data[i][j].id === placeId){
          day = i;
          order = j;
          break loop;
        }
      }
    }

    if(isSameDate(data[day][order].startDTTM, newDate)){
      //동일날짜 -> day유지
      data[day][order].isEdit = true;
      data[day][order].startDTTM = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), newDate.getHours(), newDate.getMinutes())
      data[day] = data[day].sort((x, y) => CompareDate(x.startDTTM, y.startDTTM));
    } else {
      //다른날짜 -> day변경
      const temp = {...data[day][order]};
      const newDay = travelDays.find(d => { //새 날짜 검색
        const dt = d.date;
        if(typeof(dt) !== 'string' &&
          dt.getFullYear() === newDate.getFullYear() &&
          dt.getMonth() === newDate.getMonth() &&
          dt.getDate() === newDate.getDate()){
          return true;
        }
        return false;
      });
      temp.day = newDay ? newDay.day : 0;
      temp.isEdit = true;
      temp.startDTTM = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), newDate.getHours(), newDate.getMinutes())
      data[day] = data[day].filter(x => x.id !== temp.id);
      data[temp.day].push(temp);
      data[temp.day] = data[temp.day].sort((x, y) => CompareDate(x.startDTTM, y.startDTTM));
    }
    setOrderedPlaceMatrix(data);
  }

  const updateEndDTTM = (placeId: string, newDate: Date, travelDay?: Date) => {
    if(!travelDay) return;

    const data = [...orderedPlaceMatrix];
    loop: for(let i = 0 ; i < data.length ; i++){
      for(let j = 0 ; j < data[i].length ; j++){
        if(data[i][j].id === placeId){
          data[i][j].isEdit = true;
          data[i][j].endDTTM = new Date(travelDay.getFullYear(), travelDay.getMonth(), travelDay.getDate(), newDate.getHours(), newDate.getMinutes())
          break loop;
        }
      }
    }
    setOrderedPlaceMatrix(data);
  }

  const setFromTo = (place: PlaceEdit) => {
    let source: PlaceEdit;
    loop: for(let i = 0 ; i < orderedPlaceMatrix.length ; i++){
      for(let j = 0 ; j < orderedPlaceMatrix[i].length ; j++){
        if(orderedPlaceMatrix[i][j].id === place.id){
          source = orderedPlaceMatrix[i][j - 1];
          break loop;
        }
      }
    }
    props.setFrom(source);
    props.setTo(place);
  }
  //#endregion

  //#region [conditional render]
  const AccordionButton = ({eventKey}) => {
    const { activeEventKey } = useContext(AccordionContext);
    const decoratedOnClick = useAccordionButton(eventKey);

    if(activeEventKey){
      return (
        activeEventKey.includes(eventKey)
          ? <KeyboardArrowUpIcon onClick={decoratedOnClick}/>
          : <KeyboardArrowDownIcon onClick={decoratedOnClick}/>
      )
    } else {
      return (
        <KeyboardArrowDownIcon onClick={decoratedOnClick}/>
      )
    }
  }

  const drawDroppable = (i: number, places: PlaceEdit[]) => {
    const t = travelDays[i];
    return(
      <Droppable key={i} droppableId={i.toString()}>
      {
        (p) =>
        <Card ref={p.innerRef} {...p.droppableProps}>
          { p.placeholder }
          <Card.Header className='p-1 w-100 d-flex flex-row justify-content-between'>
            {
              t.day
              ? <div className='text-align-left'>{`DAY-${t.day} ${(t.date as Date).toLocaleDateString()} ${daysOfWeek[(t.date as Date).getDay()]}`}</div>
              : <div className='text-align-left'>N/A</div>
            }
            <span>
              <PlaceIcon onClick={e => { drawDailyMarkers(i); }}/>
              <RouteIcon onClick={e => { searchDailyRoute(i); }}/>
              <AccordionButton eventKey={i.toString()}/>
            </span>
          </Card.Header>
          <Accordion.Collapse eventKey={i.toString()} className='p-0'>
            <Table>
              <colgroup>
                <col width='5%'/>
                <col width='40%'/>
                <col width='15%'/>
                <col width='15%'/>
                <col width='5%'/>
                <col width='5%'/>
              </colgroup>
              <tbody>
              { places.map((x, j) => drawDraggable(j, x, i)) }
              </tbody>
            </Table>
          </Accordion.Collapse>
        </Card>
      }
      </Droppable>
    )
  }

  const drawDraggable = (i: number, place: PlaceEdit, day: number) => {
    const travelDate: Date | undefined = typeof(travelDays[day].date) !== 'string' ? travelDays[day].date as Date : undefined;
    return (
      <Draggable key={place.id} draggableId={place.id} index={i}>
      {(p2: any) => (
        <tr ref={p2.innerRef} {...p2.draggableProps} {...p2.dragHandleProps}>
          <td className='p-1' style={{textDecoration: place.isDel ? 'line-through' : ''}}>
            {GetPlaceIcon(place)}
          </td>
          <td className='text-align-left p-1' style={{textDecoration: place.isDel ? 'line-through' : ''}}
              onClick={() => {props.setPlaceId(place.place_id)}}>
            { place.name }
            { p2.placeholder }
          </td>
          <td className='p-1'>
            <DatePicker className='w-100 text-align-center'
                        showTimeSelect
                        timeIntervals={10}
                        dateFormat="HH:mm"
                        timeFormat="HH:mm"
                        minDate={selectedTravel.startDate}
                        maxDate={selectedTravel.endDate}
                        selected={place.startDTTM ? place.startDTTM : travelDate}
                        onChange={(date) => {updateStartDTTM(place.id, date)}}/>
          </td>
          <td className='p-1'>
            <DatePicker className='w-100 text-align-center'
                        showTimeSelect
                        timeIntervals={10}
                        dateFormat="HH:mm"
                        timeFormat="HH:mm"
                        minDate={travelDate}
                        maxDate={travelDate}
                        selected={place.endDTTM ? place.endDTTM : travelDate}
                        onChange={(date) => {updateEndDTTM(place.id, date, travelDate)}}/>
          </td>
          <td className='position-relative'>
          {
            i > 0 &&
            <button className='RouteButton BetweenTr' onClick={() => {setFromTo(place)}}>{drawRouteIcon(place)}</button>
          }
          </td>
          <td className='p-1'>
          {
            place.isDel
              ? <DoDisturbIcon onClick={() => {cancelRemove(place)}}/>
              : <DeleteIcon onClick={() => {removePlace(place)}}/>
          }
          </td>
        </tr>
      )}
      </Draggable>
    )
  }

  const drawRouteIcon = (destPlace: PlaceEdit) => {
    const route = routeList.find(x => x.destinationId === destPlace.id);
    if(route){
      if(route.travelMode === google.maps.TravelMode.WALKING){
        return <DirectionsWalkIcon className='RouteIcon'/>
      }
      if(route.travelMode === google.maps.TravelMode.BICYCLING){
        return <PedalBikeIcon className='RouteIcon'/>
      }
      if(route.travelMode === google.maps.TravelMode.TRANSIT){
        return <DirectionsTransitIcon className='RouteIcon'/>
      }
      if(route.travelMode === google.maps.TravelMode.DRIVING){
        return <DriveEtaIcon className='RouteIcon'/>
      }
    } else {
      return <RouteIcon className='RouteIcon'/>
    }
  }
  //#endregion

  return(
    <Card className="custom-card card-left">
      <Card.Header>
        <div className='d-flex flex-row justify-content-between'>
          <span>{ selectedTravel?.name }</span>
          <span>
            {
              orderedPlaceArray.find(x => x.isDel || x.isEdit) && <CheckIcon onClick={confirmEdit}/>
            }
            <PlaceIcon onClick={() => drawDailyMarkers()}/>
            <CloseRoundedIcon onClick={closeTravel}/>
          </span>
        </div>
      </Card.Header>
      <Card.Body className='overflow-auto p-1'>
        <DragDropContext onDragEnd={onDragEnd}>
          <Accordion alwaysOpen>
          {
            orderedPlaceMatrix.length === travelDays.length && //안전장치
            orderedPlaceMatrix.map((x, i) => drawDroppable(i, x))
          }
          </Accordion>
        </DragDropContext>
      </Card.Body>
    </Card>
  )
}

export default TravelInfoEditPanel;