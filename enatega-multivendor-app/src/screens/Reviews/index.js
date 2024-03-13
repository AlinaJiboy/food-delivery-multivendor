import React, { useContext, useLayoutEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { styles } from './styles'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { useTranslation } from 'react-i18next'
import { scale } from '../../utils/scaling'
import { HeaderBackButton } from '@react-navigation/elements'
import { MaterialIcons } from '@expo/vector-icons'
import { alignment } from '../../utils/alignment'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import StarRating from '../../assets/SVG/small-star-icon'
import Button from '../../components/Button/Button'
import ReviewCard from '../../components/Review/ReviewCard'
import { calculateDaysAgo, groupAndCount, sortReviews } from '../../utils/customFunctions'

const sortingParams = {
  newest: 'Newest',
  highest: 'Highest Rating',
  lowest: 'Lowest Rating'
}

const Reviews = ({ navigation, route }) => {
  const restaurant = route.params.restaurantObject
  const { reviews } = restaurant
  const reviewGroups = groupAndCount(reviews, 'rating')
  const [sortBy, setSortBy] = useState('newest')

  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const { t } = useTranslation()
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (<View style={styles.headerContainer}>
        <TextDefault H4 bold >Rating&Reviews</TextDefault>
        <TextDefault H5 style={{ ...alignment.MTxSmall }} >{restaurant.restaurantName}</TextDefault>
      </View>),
      headerRight: null,
      headerStyle: {
        backgroundColor: currentTheme.white
      },
      headerLeft: () => (
        <HeaderBackButton
          truncatedLabel=""
          backImage={() => (
            <View style={styles.backImageContainer}>
              <MaterialIcons
                name="arrow-back"
                size={30}
                color={currentTheme.black}
              />
            </View>
          )}
          onPress={() => {
            navigation.goBack()
          }}
        />
      )
    })
  }, [navigation])
  const sorted = sortReviews([...reviews], sortBy)
  return <View style={{ flex: 1, backgroundColor: currentTheme.white }}>
    <ScrollView style={[styles.container]} >
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', ...alignment.MTsmall, ...alignment.MBsmall }}>
          <TextDefault bold H3>All Ratings ({restaurant.total})</TextDefault>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <StarRating/>
            <TextDefault bold H3>{restaurant.average}</TextDefault>
          </View>
        </View>
        <View>
          {Object.keys(reviewGroups).sort((a, b) => b - a).map((i, index) => {
            const filled = ((reviewGroups[i] / restaurant.total) * 100)
            const unfilled = 100 - filled
            return (
              <View key={`${index}-rate`} style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', marginVertical: scale(5) }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <TextDefault> {i} </TextDefault>
                  <StarRating isFilled={true}/>
                </View>
                <View style={{
                  flex: 1,
                  flexDirection: 'row',
                  marginHorizontal: scale(10)
                }}>
                  <View style={{
                    height: scale(5),
                    width: `${filled}%`,
                    backgroundColor: currentTheme.orange
                  }}/>
                  <View style={{
                    height: scale(5),
                    width: `${unfilled}%`,
                    backgroundColor: currentTheme.borderLight
                  }}/>
                </View>
                <View style={{ width: '10%', alignItems: 'flex-end' }}>
                  <TextDefault bolder textColor={currentTheme.gray700}>{parseInt(filled)}%</TextDefault>
                </View>
              </View>
            )
          })}

        </View>
      </View>
      <View style={{ ...alignment.MTsmall }}>
        <TextDefault textColor={currentTheme.gray900} H3 bold>Reviews</TextDefault>
        <View style={{ flexDirection: 'row', ...alignment.MTsmall }}>
          {
            Object.keys(sortingParams).map(key => (
              <Button key={key}
                textProps={{ textColor: currentTheme.gray900 }}
                buttonProps={{ onPress: () => setSortBy(key) }}
                text={sortingParams[key]}
                textStyles={styles.text}
                buttonStyles={{
                  backgroundColor: sortBy === key ? currentTheme.primary : currentTheme.gray200,
                  margin: scale(10),
                  borderRadius: scale(10)
                }}/>
            ))
          }
        </View>
        <View>
          {sorted.map(review => (<ReviewCard key={review._id}
            name={review.order.user.name}
            description={review.description}
            rating={review.rating}
            date={calculateDaysAgo(review.createdAt)}
            theme={currentTheme}/>))}
        </View>
      </View>
    </ScrollView>
  </View>
}

export default Reviews