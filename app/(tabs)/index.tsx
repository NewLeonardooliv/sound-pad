import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View, Text, TouchableOpacity, Alert, ScrollView, Animated, useWindowDimensions } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ScreenOrientation from 'expo-screen-orientation';

interface Pad {
  id: number;
  color: string;
  sound: string;
  name: string;
  isPlaying: boolean;
  customSoundUri?: string;
}

const DEFAULT_SOUNDS = [
  { id: 1, name: 'Boos', url: require('../../assets/sounds/Boos 01.mp3') },
  { id: 2, name: 'Charging', url: require('../../assets/sounds/Charging.mp3') },
  { id: 3, name: 'Chutki', url: require('../../assets/sounds/Chutki.mp3') },
  { id: 4, name: 'Clock', url: require('../../assets/sounds/Clock.mp3') },
  { id: 5, name: 'Crowd', url: require('../../assets/sounds/Crowd.mp3') },
  { id: 6, name: 'Loading', url: require('../../assets/sounds/Loading.mp3') },
  { id: 7, name: 'Money withdrawal', url: require('../../assets/sounds/Money withdrawal.mp3') },
  { id: 8, name: 'Mouse click', url: require('../../assets/sounds/mouse click.mp3') },
  { id: 9, name: 'Ohoo', url: require('../../assets/sounds/Ohoo.mp3') },
  { id: 10, name: 'PC ON', url: require('../../assets/sounds/PC ON.mp3') },
  { id: 11, name: 'PC ON 2', url: require('../../assets/sounds/PC ON 2.mp3') },
  { id: 12, name: 'Pepar', url: require('../../assets/sounds/pepar 2.mp3') },
  { id: 13, name: 'Pepar Close', url: require('../../assets/sounds/Pepar close.mp3') },
  { id: 14, name: 'POP', url: require('../../assets/sounds/POP.mp3') },
  { id: 15, name: 'Tan', url: require('../../assets/sounds/Tan.mp3') },
  { id: 16, name: 'TeTe', url: require('../../assets/sounds/TeTe.mp3') },
];


const PAD_COLORS = [
  'bg-purple-400',
  'bg-yellow-300',
  'bg-blue-400',
  'bg-red-400',
  'bg-green-400',
  'bg-pink-400',
  'bg-orange-400',
  'bg-indigo-400',
];


const ACTIVE_PAD_COLORS = [
  'bg-purple-300',
  'bg-yellow-200',
  'bg-blue-300',
  'bg-red-300',
  'bg-green-300',
  'bg-pink-300',
  'bg-orange-300',
  'bg-indigo-300',
];


const PAD_COUNT_OPTIONS = [4, 6, 8, 16];

export default function App() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;

  const [pads, setPads] = useState<Pad[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [sounds, setSounds] = useState<Record<string, Audio.Sound>>({});
  const [selectedPad, setSelectedPad] = useState<number | null>(null);
  const [activePads, setActivePads] = useState<Record<number, boolean>>({});
  const [padCount, setPadCount] = useState<number>(16);
  const [showSettings, setShowSettings] = useState(false);
  const padAnimations = useRef<Record<number, Animated.Value>>({});

  useEffect(() => {
    async function unlockOrientation() {
      await ScreenOrientation.unlockAsync();
    }
    unlockOrientation();
  }, []);


  useEffect(() => {
    initializePads(padCount);
  }, [padCount]);


  const initializePads = (count: number) => {
    const initialPads = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      color: PAD_COLORS[i % PAD_COLORS.length],
      sound: `sound${(i % DEFAULT_SOUNDS.length) + 1}`,
      name: DEFAULT_SOUNDS[i % DEFAULT_SOUNDS.length].name,
      isPlaying: false,
    }));
    setPads(initialPads);

    initialPads.forEach(pad => {
      padAnimations.current[pad.id] = new Animated.Value(1);
    });
  };

  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Erro ao configurar áudio:', error);
      }
    }

    setupAudio();
  }, []);


  useEffect(() => {
    async function loadSounds() {
      const loadedSounds: Record<string, Audio.Sound> = {};

      for (let i = 0; i < DEFAULT_SOUNDS.length; i++) {
        try {
          const { sound } = await Audio.Sound.createAsync(DEFAULT_SOUNDS[i].url, {
            shouldPlay: false,
            isLooping: false,
            volume: 1.0,
          });
          loadedSounds[`sound${i + 1}`] = sound;
        } catch (error) {
          console.error(`Erro ao carregar som ${i + 1}:`, error);
        }
      }

      setSounds(loadedSounds);
    }
    loadSounds();

    return () => {
      Object.values(sounds).forEach(sound => {
        sound.unloadAsync();
      });
    };
  }, []);


  const animatePad = (padId: number) => {
    padAnimations.current[padId].setValue(1);

    Animated.sequence([
      Animated.timing(padAnimations.current[padId], {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(padAnimations.current[padId], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();


    setActivePads(prev => ({
      ...prev,
      [padId]: true,
    }));


    setTimeout(() => {
      setActivePads(prev => ({
        ...prev,
        [padId]: false,
      }));
    }, 200);
  };


  const playSound = async (padId: number) => {
    try {
      const pad = pads.find(p => p.id === padId);
      if (!pad) return;

      let soundKey = pad.customSoundUri || pad.sound;

      if (pad.customSoundUri && !sounds[pad.customSoundUri]) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: pad.customSoundUri },
            { shouldPlay: false, isLooping: false, volume: 1.0 }
          );
          setSounds(prev => ({ ...prev, [pad.customSoundUri!]: sound }));
          soundKey = pad.customSoundUri;
        } catch (error) {
          console.error('Erro ao carregar som personalizado:', error);

          soundKey = pad.sound;
        }
      }

      if (sounds[soundKey]) {
        animatePad(padId);

        await sounds[soundKey].stopAsync();
        await sounds[soundKey].setPositionAsync(0);


        await sounds[soundKey].playAsync();


        sounds[soundKey].setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {

            setActivePads(prev => ({
              ...prev,
              [padId]: false,
            }));
          }
        });
      }
    } catch (error) {
      console.error('Erro ao tocar som:', error);
    }
  };


  const handlePadPress = (padId: number) => {
    if (editMode) {
      setSelectedPad(padId);
    } else {
      playSound(padId);
    }
  };

  const changePadSound = (padId: number, soundId: number) => {
    setPads(prevPads =>
      prevPads.map(pad =>
        pad.id === padId
          ? {
            ...pad,
            sound: `sound${soundId}`,
            name: DEFAULT_SOUNDS[soundId - 1].name,
            customSoundUri: undefined
          }
          : pad
      )
    );
    setSelectedPad(null);
  };

  const pickCustomSound = async (padId: number) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('Seleção de arquivo cancelada');
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.name || 'Som personalizado';

      setPads(prevPads =>
        prevPads.map(pad =>
          pad.id === padId
            ? {
              ...pad,
              customSoundUri: asset.uri,
              name: fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName
            }
            : pad
        )
      );

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: asset.uri },
          { shouldPlay: false, isLooping: false, volume: 1.0 }
        );
        setSounds(prev => ({ ...prev, [asset.uri]: sound }));

        await sound.playAsync();
      } catch (error) {
        console.error('Erro ao carregar som personalizado:', error);
        Alert.alert('Erro', 'Não foi possível carregar o arquivo de áudio selecionado.');
      }

      setSelectedPad(null);
    } catch (error) {
      console.error('Erro ao selecionar arquivo:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo de áudio.');
    }
  };

  const changePadColor = (padId: number, colorIndex: number) => {
    setPads(prevPads =>
      prevPads.map(pad =>
        pad.id === padId
          ? { ...pad, color: PAD_COLORS[colorIndex] }
          : pad
      )
    );
  };

  const getActivePadColor = (padColor: string) => {
    const colorIndex = PAD_COLORS.indexOf(padColor);
    return colorIndex >= 0 ? ACTIVE_PAD_COLORS[colorIndex] : padColor;
  };

  const removeCustomSound = (padId: number) => {
    const pad = pads.find(p => p.id === padId);
    if (!pad || !pad.customSoundUri) return;

    if (sounds[pad.customSoundUri]) {
      sounds[pad.customSoundUri].unloadAsync();
      setSounds(prev => {
        const newSounds = { ...prev };
        delete newSounds[pad.customSoundUri!];
        return newSounds;
      });
    }

    const defaultSoundId = (padId - 1) % DEFAULT_SOUNDS.length + 1;
    setPads(prevPads =>
      prevPads.map(p =>
        p.id === padId
          ? {
            ...p,
            customSoundUri: undefined,
            sound: `sound${defaultSoundId}`,
            name: DEFAULT_SOUNDS[defaultSoundId - 1].name
          }
          : p
      )
    );
  };


  const changePadCount = (count: number) => {
    const currentPads = [...pads];

    if (count < padCount) {
      for (let i = count; i < padCount; i++) {
        const pad = currentPads[i];
        if (pad && pad.customSoundUri && sounds[pad.customSoundUri]) {
          sounds[pad.customSoundUri].unloadAsync();
          setSounds(prev => {
            const newSounds = { ...prev };
            delete newSounds[pad.customSoundUri!];
            return newSounds;
          });
        }
      }
    }

    setPadCount(count);

    if (selectedPad && selectedPad > count) {
      setSelectedPad(null);
    }

    setShowSettings(false);
  };

  const getPadSize = () => {
    if (isLandscape) {
      switch (padCount) {
        case 4:
          return '23%';
        case 6:
          return '32%';
        case 8:
          return '23%';
        case 16:
        default:
          return '23%';
      }
    } else {
      switch (padCount) {
        case 4:
          return '48%';
        case 6:
          return '31%';
        case 8:
          return '23%';
        case 16:
        default:
          return '23%';
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <StatusBar style="light" />
      <View className={`flex-1`}>
        <View className={`rounded-xl bg-gradient-to-r from-purple-900 to-blue-900 shadow-lg`}>
          <View className="flex-row justify-between items-center p-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mr-3 justify-center items-center">
                <Ionicons name="musical-notes" size={20} color="white" />
              </View>
              <View>
                <Text className="text-white text-xs font-medium opacity-80">MUSIC CONTROLLER</Text>
                <Text className="text-white text-2xl font-bold">Léo Pad</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <TouchableOpacity
                className="h-10 w-10 rounded-full bg-black/20 backdrop-blur-lg mr-3 justify-center items-center border border-white/20"
                onPress={() => setShowSettings(!showSettings)}
              >
                <Ionicons
                  name={showSettings ? "close-outline" : "settings-outline"}
                  size={20}
                  color="white"
                />
              </TouchableOpacity>

              <TouchableOpacity
                className={`px-5 py-2.5 rounded-full flex-row items-center ${editMode
                  ? 'bg-gradient-to-r from-red-600 to-red-500'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500'
                  } shadow-md`}
                onPress={() => setEditMode(!editMode)}
              >
                <Ionicons
                  name={editMode ? "close-outline" : "create-outline"}
                  size={18}
                  color="white"
                  style={{ marginRight: 5 }}
                />
                <Text className="text-white font-semibold">
                  {editMode ? 'Sair' : 'Editar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView>

          <View className={`flex-1 ${isLandscape ? 'flex-row' : 'flex-col'}`}>
            <View className="flex-1">
              {showSettings && (
                <View className="bg-gray-800 p-4 rounded-lg mb-4">
                  <Text className="text-white text-lg font-bold mb-3">Configurações</Text>

                  <Text className="text-white mb-2">Quantidade de Pads:</Text>
                  <View className="flex-row justify-between">
                    {PAD_COUNT_OPTIONS.map(count => (
                      <TouchableOpacity
                        key={count}
                        className={`px-4 py-2 rounded-lg ${padCount === count ? 'bg-blue-500' : 'bg-gray-700'}`}
                        onPress={() => changePadCount(count)}
                      >
                        <Text className="text-white font-semibold">{count} Pads</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View className="flex-1">
                <View className={`flex-row flex-wrap ${padCount === 4 && !isLandscape ? 'justify-around' : 'justify-between'}`}>
                  {pads.map((pad) => {
                    const isActive = activePads[pad.id];
                    const padSize = getPadSize();
                    return (
                      <Animated.View
                        key={pad.id}
                        style={{
                          transform: [{ scale: padAnimations.current[pad.id] || 1 }],
                          width: padSize,
                          aspectRatio: 1,
                          marginBottom: 12,
                        }}
                      >
                        <TouchableOpacity
                          className={`w-full h-full rounded-lg justify-center items-center ${isActive ? getActivePadColor(pad.color) : pad.color} ${selectedPad === pad.id ? 'border-4 border-white' : ''}`}
                          onPress={() => handlePadPress(pad.id)}
                          activeOpacity={0.7}
                        >
                          <Text className="text-white text-xs font-semibold">{pad.name}</Text>
                          <Text className="text-white text-xs opacity-70">PAD{pad.id}</Text>
                          {pad.customSoundUri && (
                            <View className="absolute top-1 right-1">
                              <Ionicons name="musical-note" size={12} color="white" />
                            </View>
                          )}
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {!isLandscape && editMode && selectedPad && (
          <View className="bg-gray-800 p-4 rounded-lg mt-4">
            <Text className="text-white text-lg font-bold mb-3">Editar PAD {selectedPad}</Text>

            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white">Sons Padrão:</Text>
              <TouchableOpacity
                className="px-3 py-1 bg-green-600 rounded-lg"
                onPress={() => pickCustomSound(selectedPad)}
              >
                <Text className="text-white font-semibold">Adicionar Som Personalizado</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {DEFAULT_SOUNDS.map((sound) => (
                <TouchableOpacity
                  key={sound.id}
                  className={`mr-2 px-3 py-2 rounded-lg ${pads.find(p => p.id === selectedPad)?.sound === `sound${sound.id}` &&
                    !pads.find(p => p.id === selectedPad)?.customSoundUri
                    ? 'bg-green-500'
                    : 'bg-gray-700'
                    }`}
                  onPress={() => changePadSound(selectedPad, sound.id)}
                >
                  <Text className="text-white">{sound.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {pads.find(p => p.id === selectedPad)?.customSoundUri && (
              <View className="mb-4 p-3 bg-gray-700 rounded-lg">
                <View className="flex-row justify-between items-center">
                  <Text className="text-white font-semibold">Som Personalizado:</Text>
                  <TouchableOpacity
                    className="px-2 py-1 bg-red-500 rounded-lg"
                    onPress={() => removeCustomSound(selectedPad)}
                  >
                    <Text className="text-white">Remover</Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-white mt-1">
                  {pads.find(p => p.id === selectedPad)?.name}
                </Text>
              </View>
            )}

            <Text className="text-white mb-2">Selecionar Cor:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {PAD_COLORS.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  className={`mr-2 w-10 h-10 rounded-full ${color} justify-center items-center`}
                  onPress={() => changePadColor(selectedPad, index)}
                >
                  {pads.find(p => p.id === selectedPad)?.color === color && (
                    <Ionicons name="checkmark" size={20} color="white" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}