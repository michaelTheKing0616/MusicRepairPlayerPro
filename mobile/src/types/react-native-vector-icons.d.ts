declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import type {ComponentType} from 'react';
  import type {TextProps} from 'react-native';

  const MaterialCommunityIcons: ComponentType<
    TextProps & {
      name: string;
      size?: number;
      color?: string;
    }
  >;

  export default MaterialCommunityIcons;
}

