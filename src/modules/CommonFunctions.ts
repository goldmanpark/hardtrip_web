export const CompareDate = (d1?: Date, d2?: Date) => {
  if(!d1 && !d2) return 0;
  if(!d1) return 1;
  if(!d2) return -1;
  else return d1.getTime() - d2.getTime();
}

export const GetDaysDiff = (d1?: Date, d2?: Date): number => {
  if(d1 instanceof Date && d2 instanceof Date){
    const oneDay = 24 * 60 * 60 * 1000;
    const diff = d1.getTime() - d2.getTime();
    return Math.round(diff / oneDay);
  } else {
    return 0;
  }
}