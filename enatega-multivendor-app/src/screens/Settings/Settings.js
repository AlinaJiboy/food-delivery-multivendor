import React, { useState, useContext, useEffect } from 'react'
import {
  AppState,
  View,
  TouchableOpacity,
  Platform,
  Linking,
  StatusBar,
  Image,
  ActivityIndicator
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Updates from 'expo-updates'
import * as Notifications from 'expo-notifications'
import * as Localization from 'expo-localization'
import Modal from 'react-native-modal'
import { SafeAreaView } from 'react-native-safe-area-context'
import { profile } from '../../apollo/queries'
import { pushToken, updateNotificationStatus } from '../../apollo/mutations'
import gql from 'graphql-tag'
import { useMutation } from '@apollo/client'
import styles from './styles'
import i18n from '../../../i18n'
import CheckboxBtn from '../../ui/FdCheckbox/CheckboxBtn'
import RadioButton from '../../ui/FdRadioBtn/RadioBtn'
import Spinner from '../../components/Spinner/Spinner'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import UserContext from '../../context/User'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import Constants from 'expo-constants'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { alignment } from '../../utils/alignment'
import * as Device from 'expo-device'
import Analytics from '../../utils/analytics'
const languageTypes = [
  { value: 'English', code: 'en', index: 0 },
  { value: 'français', code: 'fr', index: 1 },
  { value: 'ភាសាខ្មែរ', code: 'km', index: 2 },
  { value: '中文', code: 'zh', index: 3 },
  { value: 'Deutsche', code: 'de', index: 4 },
  { value: 'arabic', code: 'ar', index: 5 }
]

const PUSH_TOKEN = gql`
  ${pushToken}
`
const UPDATE_NOTIFICATION_TOKEN = gql`
  ${updateNotificationStatus}
`
const PROFILE = gql`
  ${profile}
`

function Settings(props) {
  const { profile, loadingProfile, errorProfile } = useContext(UserContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]

  const [languageName, languageNameSetter] = useState('English')
  const [offerNotification, offerNotificationSetter] = useState(
    profile.isOfferNotification
  )
  const [orderNotification, orderNotificationSetter] = useState(
    profile.isOrderNotification
  )
  const [modalVisible, modalVisibleSetter] = useState(false)
  const [activeRadio, activeRadioSetter] = useState(languageTypes[0].index)
  const [darkTheme, setDarkTheme] = useState(themeContext.ThemeValue === 'Dark')
  const [btnText, setBtnText] = useState(null)
  // eslint-disable-next-line no-unused-vars
  const [appState, setAppState] = useState(AppState.currentState)
  const [uploadToken] = useMutation(PUSH_TOKEN)
  const [mutate, { loading }] = useMutation(UPDATE_NOTIFICATION_TOKEN, {
    onCompleted,
    onError,
    refetchQueries: [{ query: PROFILE }]
  })
  useEffect(async() => {
    await Analytics.track(Analytics.events.NAVIGATE_TO_SETTINGS)
  }, [])
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(currentTheme.headerBackground)
    }
    StatusBar.setBarStyle('light-content')
  }, [])

  useEffect(() => {
    props.navigation.setOptions({
      headerRight: null,
      headerTitle: i18n.t('titleSettings'),
      headerTitleAlign: 'left',
      headerTitleContainerStyle: {
        alignItems: 'flex-start'
      }
    })
    selectLanguage()
    checkPermission()
  }, [props.navigation])

  const _handleAppStateChange = async nextAppState => {
    if (nextAppState === 'active') {
      let token = null
      const permission = await getPermission()
      if (permission === 'granted') {
        if (!profile.notificationToken) {
          token = await Notifications.getExpoPushTokenAsync()
          uploadToken({ variables: { token: token.data } })
        }
        offerNotificationSetter(profile.isOfferNotification)
        orderNotificationSetter(profile.isOrderNotification)
      } else {
        offerNotificationSetter(false)
        orderNotificationSetter(false)
      }
    }
    setAppState(nextAppState)
  }

  useEffect(() => {
    AppState.addEventListener('change', _handleAppStateChange)
    return () => {
      AppState.removeEventListener('change', _handleAppStateChange)
    }
  }, [])

  async function checkPermission() {
    const permission = await getPermission()
    if (permission !== 'granted') {
      offerNotificationSetter(false)
      orderNotificationSetter(false)
    } else {
      offerNotificationSetter(profile.isOfferNotification)
      orderNotificationSetter(profile.isOrderNotification)
    }
  }

  async function getPermission() {
    const { status } = await Notifications.getPermissionsAsync()
    return status
  }
  function toggleTheme() {
    if (themeContext.ThemeValue === 'Pink') {
      themeContext.dispatch({ type: 'Dark' })
    } else themeContext.dispatch({ type: 'Pink' })
    setDarkTheme(!darkTheme)
  }

  async function selectLanguage() {
    const lang = await AsyncStorage.getItem('enatega-language')
    if (lang) {
      const defLang = languageTypes.findIndex(el => el.code === lang)
      const langName = languageTypes[defLang].value
      activeRadioSetter(defLang)
      languageNameSetter(langName)
    }
  }

  async function onSelectedLanguage() {
    const languageInd = activeRadio
    if (Platform.OS === 'android') {
      const localization = await Localization.getLocalizationAsync()
      localization.locale = languageTypes[languageInd].code
      await AsyncStorage.setItem(
        'enatega-language',
        languageTypes[languageInd].code
      )
      Updates.reloadAsync()
    }
  }

  function onCompleted() {
    FlashMessage({
      message: 'Notification Status Updated'
    })
  }

  function onError(error) {
    try {
      FlashMessage({
        message: error.networkError.result.errors[0].message
      })
    } catch (err) {}
  }

  async function updateNotificationStatus(notificationCheck) {
    let orderNotify, offerNotify
    if (!Device.isDevice) {
      FlashMessage({
        message: 'Notification do not work on simulator'
      })
      return
    }

    const permission = await getPermission()
    if (!profile.notificationToken || permission !== 'granted') {
      Linking.openSettings()
    }
    if (notificationCheck === 'offer') {
      offerNotificationSetter(!offerNotification)
      orderNotify = orderNotification
      offerNotify = !offerNotification
    }

    if (notificationCheck === 'order') {
      orderNotificationSetter(!orderNotification)
      orderNotify = !orderNotification
      offerNotify = offerNotification
    }
    mutate({
      variables: {
        offerNotification: offerNotify,
        orderNotification: orderNotify
      }
    })
  }
  if (errorProfile) {
    FlashMessage({
      message: 'Error in profile'
    })
  }
  if (loadingProfile) return <Spinner />
  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[styles().flex, styles(currentTheme).mainContainer]}>
      {/* <StatusBar
        barStyle="light-content"
        backgroundColor={currentTheme.headerBackground}
      /> */}

      <View style={styles().flex}>
        <View style={styles(currentTheme).topContainer}>
          <Image
            source={require('../../assets/images/settings.png')}
            PlaceholderContent={<ActivityIndicator />}
            style={{ resizeMode: 'contain', flex: 1, aspectRatio: 1 }}
          />
        </View>
        <View
          style={[
            styles(currentTheme).lowerContainer,
            {
              backgroundColor: currentTheme.white
            }
          ]}>
          {Platform.OS === 'android' && (
            <View style={[styles(currentTheme).languageContainer]}>
              <View style={styles().changeLanguage}>
                <View style={styles().width85}>
                  <TextDefault
                    numberOfLines={1}
                    textColor={currentTheme.menuBar}>
                    Language
                  </TextDefault>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => modalVisibleSetter(true)}
                  style={styles().button}>
                  <TextDefault
                    textColor={currentTheme.tagColor}
                    small
                    B700
                    bolder>
                    Edit
                  </TextDefault>
                </TouchableOpacity>
              </View>
              <TextDefault
                textColor={currentTheme.fontMainColor}
                bolder
                H5
                B700>
                {languageName}
              </TextDefault>
            </View>
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              updateNotificationStatus('offer')
              setBtnText('offer')
            }}
            style={[
              styles(currentTheme).notificationContainer,
              styles().shadow
            ]}>
            <View style={styles().notificationChekboxContainer}>
              <CheckboxBtn
                checked={offerNotification}
                onPress={() => {
                  updateNotificationStatus('offer')
                  setBtnText('offer')
                }}
              />
              <TextDefault
                numberOfLines={1}
                textColor={currentTheme.fontMainColor}
                style={alignment.MLsmall}>
                {' '}
                Receive Special Offers{' '}
              </TextDefault>
            </View>
            {loading && btnText === 'offer' && (
              <View>
                <Spinner size="small" backColor="transparent" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              updateNotificationStatus('order')
              setBtnText('order')
            }}
            style={[
              styles(currentTheme).notificationContainer,
              styles().shadow
            ]}>
            <View style={styles().notificationChekboxContainer}>
              <CheckboxBtn
                checked={orderNotification}
                onPress={() => {
                  updateNotificationStatus('order')
                  setBtnText('order')
                }}
              />
              <TextDefault
                numberOfLines={1}
                textColor={currentTheme.fontMainColor}
                style={alignment.MLsmall}>
                {' '}
                Get updates on your order status!{' '}
              </TextDefault>
            </View>
            {loading && btnText === 'order' && (
              <View>
                <Spinner size="small" backColor="transparent" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => toggleTheme()}
            style={[
              styles(currentTheme).notificationContainer,
              styles().shadow
            ]}>
            <View style={styles().notificationChekboxContainer}>
              <CheckboxBtn checked={darkTheme} onPress={() => toggleTheme()} />
              <TextDefault
                numberOfLines={1}
                textColor={currentTheme.fontMainColor}
                style={alignment.MLsmall}>
                {' '}
                Turn on Dark Theme
              </TextDefault>
            </View>
          </TouchableOpacity>
          <View style={styles().versionContainer}>
            <TextDefault textColor={currentTheme.statusSecondColor}>
              Version: {Constants.manifest.version}
            </TextDefault>
          </View>
        </View>
      </View>
      {/* Modal for language Changes */}

      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => modalVisibleSetter(false)}
        onBackButtonPress={() => modalVisibleSetter(false)}>
        <View style={styles().modalContainer}>
          <TextDefault
            textColor={currentTheme.fontMainColor}
            bolder
            H5
            style={alignment.MBsmall}>
            Select Language
          </TextDefault>

          {languageTypes.map((item, index) => (
            <TouchableOpacity
              activeOpacity={0.7}
              key={index}
              onPress={() => activeRadioSetter(item.index)}
              style={[styles().radioContainer]}>
              <RadioButton
                animation={'bounceIn'}
                size={13}
                outerColor={currentTheme.radioOuterColor}
                innerColor={currentTheme.radioColor}
                isSelected={activeRadio === item.index}
                onPress={() => activeRadioSetter(item.index)}
              />
              <TextDefault
                numberOfLines={1}
                textColor={currentTheme.fontMainColor}
                bold
                style={alignment.MLsmall}>
                {item.value}
              </TextDefault>
            </TouchableOpacity>
          ))}
          <View style={styles().modalButtonsContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles().modalButtons}
              onPress={() => modalVisibleSetter(false)}>
              <TextDefault
                numberOfLines={1}
                textColor={currentTheme.tagColor}
                small
                bolder
                uppercase>
                Cancel
              </TextDefault>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles().modalButtons}
              onPress={() => onSelectedLanguage()}>
              <TextDefault
                textColor={currentTheme.tagColor}
                bolder
                uppercase
                small>
                Select
              </TextDefault>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
export default Settings
