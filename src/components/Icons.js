/**
 * Ionicons usando fonte local para evitar erro de resolução do Metro
 * com @expo/vector-icons no SDK 54.
 */
import createIconSet from '@expo/vector-icons/build/createIconSet';
import glyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';

const font = require('../../assets/fonts/Ionicons.ttf');

export default createIconSet(glyphMap, 'ionicons', font);
