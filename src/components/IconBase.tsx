import { createElement, SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: string | number;
}

export const IconBase = ({ size = 24, fill = 'currentColor', children, ...props }: IconProps) =>
  createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill,
      ...props,
    },
    children
  );
