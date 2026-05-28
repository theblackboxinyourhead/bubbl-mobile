import Reactotron from 'reactotron-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

Reactotron
  .setAsyncStorageHandler(AsyncStorage)
  .configure({ name: 'Bubbl Mobile' })
  .useReactNative({
    networking: {
      ignoreUrls: /symbolicate|\.metro\./,
    },
  })
  .connect()
