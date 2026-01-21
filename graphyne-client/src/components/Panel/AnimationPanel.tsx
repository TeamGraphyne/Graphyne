import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateElement } from '../../store/canvasSlice';
import { RootState } from '../../store/store';
import gsap from 'gsap';

export const AnimationPanel = () => {
  const dispatch = useDispatch();
  const selectedId = useSelector((state: RootState) => state.canvas.present.selectedIds[0]);
  const element = useSelector((state: RootState) => 
    state.canvas.present.elements.find(el => el.id === selectedId)
  );

  if (!element) return <div>Select an object to animate</div>;