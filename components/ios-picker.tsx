"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion"

interface PickerOption {
  id: string
  label: string
}

interface IOSPickerProps {
  options: PickerOption[]
  value: string
  onChange: (value: string) => void
  onChangeCommitted?: (value: string) => void
}

export function IOSPicker({ options, value, onChange, onChangeCommitted }: IOSPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(() => {
    const initialIndex = options.findIndex((opt) => opt.id === value)
    return initialIndex !== -1 ? initialIndex + options.length : options.length
  })
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [lastY, setLastY] = useState(0)
  const [velocity, setVelocity] = useState(0)
  const [lastTime, setLastTime] = useState(0)
  const animationRef = useRef<number | null>(null)
  const isAnimatingRef = useRef(false)
  // Рефы для корректной инерции без устаревших значений из замыканий
  const velocityRef = useRef(0)
  const indexRef = useRef<number>(0)
  const lastReportedIndexRef = useRef<number>(0)
  const lastLiveEmitTsRef = useRef<number>(0)
  const liveEmitIntervalMs = 5
  const expandedHitPadding = 24 // px — расширенная зона взаимодействия вокруг визуального блока
  const pointerStartRef = useRef<((y: number) => void) | null>(null)
  const pointerMoveRef = useRef<((y: number) => void) | null>(null)
  const pointerEndRef = useRef<(() => void) | null>(null)

  const itemHeight = 50
  const visibleItems = 5
  const centerIndex = Math.floor(visibleItems / 2)
  const friction = 0.9985 // корректный коэффициент трения (<1), гораздо инертнее
  const attractStrength = 0.12 // мягче притяжение
  const minStartVelocity = 0.03 // старт инерции при малом флике
  
  const snapThreshold = 0.05 // порог остановки
  const captureThreshold = 0.18 // уже окно захвата, опираемся на притяжение

  // Синхронизация рефов со стейтом
  useEffect(() => {
    indexRef.current = currentIndex
    lastReportedIndexRef.current = Math.round(currentIndex)
  }, [currentIndex])
  useEffect(() => {
    velocityRef.current = velocity
  }, [velocity])

  // Создаем бесконечный массив для плавной прокрутки
  const infiniteOptions = [...options, ...options, ...options]

  // Когда тянем — слушаем события на всём окне (чтобы не терять жест при выходе курсора/пальца за пределы блока)
  // NOTE: завязан на handlePointerMove/End — объявим обработчики в ref ниже и используем их здесь
  useEffect(() => {
    if (!isDragging) return
    const onPointerMove = (e: PointerEvent) => {
      pointerMoveRef.current?.(e.clientY)
    }
    const onPointerUp = () => {
      pointerEndRef.current?.()
    }
    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp, { passive: false })
    return () => {
      window.removeEventListener('pointermove', onPointerMove as any)
      window.removeEventListener('pointerup', onPointerUp as any)
    }
  }, [isDragging])

  // Находим начальный индекс
  useEffect(() => {
    const initialIndex = options.findIndex((opt) => opt.id === value)
    if (initialIndex !== -1) {
      const newIndex = initialIndex + options.length
      setCurrentIndex(newIndex)
    }
  }, [value, options])

  // Убираем onChange при каждом изменении индекса: триггер только при снапе/клике

  // Физика движения с трением
  useEffect(() => {
    if (!isDragging && Math.abs(velocityRef.current) > snapThreshold && !isAnimatingRef.current) {
      isAnimatingRef.current = true
      
      // Добавляем таймаут для принудительного завершения анимации
      const timeoutId = setTimeout(() => {
        if (isAnimatingRef.current) {
          const currentIdx = indexRef.current
          const snapped = Math.round(currentIdx)
          setCurrentIndex(snapped)
          console.log('Timeout forced completion - animation stopped')
          setVelocity(0)
          isAnimatingRef.current = false
          
          // Вызываем onChange при принудительном завершении по таймауту
          const actualIndex = ((snapped % options.length) + options.length) % options.length
          const selectedOption = options[actualIndex]
          console.log('Timeout forced completion - calling onChange:', selectedOption?.label)
          if (selectedOption) {
            onChange(selectedOption.id)
          }
        }
      }, 1000) // Максимум 1 секунда анимации
      
      const animate = () => {
        const prev = indexRef.current
        const newIndex = prev + velocityRef.current
        const nextVelocity = velocityRef.current * friction
        velocityRef.current = nextVelocity
        setVelocity(nextVelocity)

        // Throttle onChange во время прокрутки
        const now = performance.now()
        if (now - lastLiveEmitTsRef.current >= liveEmitIntervalMs) {
          lastLiveEmitTsRef.current = now
          const nearest = Math.round(newIndex)
          if (nearest !== lastReportedIndexRef.current) {
            lastReportedIndexRef.current = nearest
            const idx = ((nearest % options.length) + options.length) % options.length
            const opt = options[idx]
            if (opt) onChange(opt.id)
          }
        }

        // Мгновенный захват, если близко к центру
        const distanceToNearest = Math.abs(newIndex - Math.round(newIndex))
        if (distanceToNearest <= captureThreshold) {
          const snapped = Math.round(newIndex)
          indexRef.current = snapped
          setCurrentIndex(snapped)
          setVelocity(0)
          isAnimatingRef.current = false
          clearTimeout(timeoutId)
          const actualIndex = ((snapped % options.length) + options.length) % options.length
          const selectedOption = options[actualIndex]
          if (selectedOption) {
            onChange(selectedOption.id)
            if (onChangeCommitted) onChangeCommitted(selectedOption.id)
          }
        } else if (Math.abs(velocityRef.current) <= snapThreshold) {
          // Снап к ближайшему элементу
          const snapped = Math.round(newIndex)
          indexRef.current = snapped
          setCurrentIndex(snapped)
          setVelocity(0)
          isAnimatingRef.current = false
          clearTimeout(timeoutId)
          const actualIndex = ((snapped % options.length) + options.length) % options.length
          const selectedOption = options[actualIndex]
          if (selectedOption) onChange(selectedOption.id)
        } else {
          indexRef.current = newIndex
          setCurrentIndex(newIndex)
          animationRef.current = requestAnimationFrame(animate)
        }
      }
      
      animationRef.current = requestAnimationFrame(animate)
      
      return () => {
        clearTimeout(timeoutId)
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isDragging, options, onChange, friction, snapThreshold])

  // Бесконечная прокрутка
  useEffect(() => {
    if (currentIndex < options.length * 0.5) {
      setCurrentIndex((prev: number) => prev + options.length)
    } else if (currentIndex > options.length * 2.5) {
      setCurrentIndex((prev: number) => prev - options.length)
    }
  }, [currentIndex, options.length])

  const handlePointerStart = useCallback((clientY: number) => {
    setIsDragging(true)
    setStartY(clientY)
    setLastY(clientY)
    setVelocity(0)
    setLastTime(Date.now())
    isAnimatingRef.current = false
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  // Пробрасываем актуальные обработчики в ref, чтобы можно было вызывать до их объявления в эффектах
  pointerStartRef.current = handlePointerStart

  const handlePointerMove = useCallback((clientY: number) => {
    if (!isDragging) return

    const deltaY = clientY - lastY
    const deltaTime = Date.now() - lastTime

    if (deltaTime > 0) {
      const newVelocity = (-deltaY / itemHeight / (deltaTime / 16)) * 1.2 // velocityGain (balanced)
      velocityRef.current = newVelocity
      setVelocity(newVelocity)
    }

    // Вычисляем следующий индекс без функции-обновителя, чтобы избежать сайд-эффектов в рендере
    const next = indexRef.current - deltaY / itemHeight
    indexRef.current = next
    setCurrentIndex(next)

    // Throttle onChange во время перетаскивания (вне функции-обновителя)
    const now = performance.now()
    if (now - lastLiveEmitTsRef.current >= liveEmitIntervalMs) {
      lastLiveEmitTsRef.current = now
      const nearest = Math.round(next)
      if (nearest !== lastReportedIndexRef.current) {
        lastReportedIndexRef.current = nearest
        const idx = ((nearest % options.length) + options.length) % options.length
        const opt = options[idx]
        if (opt) onChange(opt.id)
      }
    }

    setLastY(clientY)
    setLastTime(Date.now())
  }, [isDragging, lastY, lastTime, itemHeight, onChange])
  pointerMoveRef.current = handlePointerMove

  const handlePointerEnd = useCallback(() => {
    console.log('handlePointerEnd - isDragging:', isDragging, 'isAnimating:', isAnimatingRef.current, 'velocity:', velocity)
    setIsDragging(false)

    // Высокая скорость — запускаем инерцию и снап по окончании
    if (Math.abs(velocityRef.current) > snapThreshold && !isAnimatingRef.current) {
      isAnimatingRef.current = true
      const animate = () => {
        const prev = indexRef.current
        const newIndex = prev + velocityRef.current
        const nextVelocity = velocityRef.current * friction
        velocityRef.current = nextVelocity
        setVelocity(nextVelocity)
        // Throttle onChange во время прокрутки
        const now = performance.now()
        if (now - lastLiveEmitTsRef.current >= liveEmitIntervalMs) {
          lastLiveEmitTsRef.current = now
          const nearest = Math.round(newIndex)
          if (nearest !== lastReportedIndexRef.current) {
            lastReportedIndexRef.current = nearest
            const idx = ((nearest % options.length) + options.length) % options.length
            const opt = options[idx]
            if (opt) onChange(opt.id)
          }
        }
        // Мгновенный захват, если близко к центру
        const distanceToNearest = Math.abs(newIndex - Math.round(newIndex))
        if (distanceToNearest <= captureThreshold) {
          const snapped = Math.round(newIndex)
          indexRef.current = snapped
          setCurrentIndex(snapped)
          setVelocity(0)
          isAnimatingRef.current = false
          const actualIndex = ((snapped % options.length) + options.length) % options.length
          const selectedOption = options[actualIndex]
          if (selectedOption) {
            onChange(selectedOption.id)
            if (onChangeCommitted) onChangeCommitted(selectedOption.id)
          }
        } else if (Math.abs(velocityRef.current) <= snapThreshold) {
          const snapped = Math.round(newIndex)
          indexRef.current = snapped
          setCurrentIndex(snapped)
          setVelocity(0)
          isAnimatingRef.current = false
          const actualIndex = ((snapped % options.length) + options.length) % options.length
          const selectedOption = options[actualIndex]
          if (selectedOption) onChange(selectedOption.id)
        } else {
          indexRef.current = newIndex
          setCurrentIndex(newIndex)
          animationRef.current = requestAnimationFrame(animate)
        }
      }
      animationRef.current = requestAnimationFrame(animate)
      return
    }

    // Низкая скорость или уже не анимируется — сразу снапим
    const snapped = Math.round(currentIndex)
    setCurrentIndex(snapped)
    indexRef.current = snapped
    setVelocity(0)
    isAnimatingRef.current = false
    const actualIndex = ((snapped % options.length) + options.length) % options.length
    const selectedOption = options[actualIndex]
    if (selectedOption) {
      onChange(selectedOption.id)
      if (onChangeCommitted) onChangeCommitted(selectedOption.id)
    }
  }, [currentIndex, isDragging, velocity, snapThreshold, friction, options, onChange])
  pointerEndRef.current = handlePointerEnd

  const handleItemClick = useCallback((index: number) => {
    const actualIndexClicked = ((index % options.length) + options.length) % options.length
    console.log('Item clicked - index:', index, 'actualIndex:', actualIndexClicked, 'label:', options[actualIndexClicked].label)
    setCurrentIndex(index)
    setVelocity(0)
    isAnimatingRef.current = false
    const actualIndex = ((index % options.length) + options.length) % options.length
    const selectedOption = options[actualIndex]
    if (selectedOption) {
      onChange(selectedOption.id)
      if (onChangeCommitted) onChangeCommitted(selectedOption.id)
    }
  }, [options, onChange, onChangeCommitted])

  // Обработчик для touch кликов
  const handleItemTouch = useCallback((e: React.TouchEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Item touched - index:', index)
    
    // Тактильная обратная связь для мобильных устройств
    if (navigator.vibrate) {
      navigator.vibrate(50) // Короткая вибрация
    }
    
    handleItemClick(index)
  }, [handleItemClick])

  // Обработчики событий
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handlePointerStart(e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault()
      handlePointerMove(e.clientY)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault()
    handlePointerEnd()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    handlePointerStart(touch.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      e.preventDefault()
      handlePointerMove(e.touches[0].clientY)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Не блокируем preventDefault для прокрутки
    handlePointerEnd()
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
    >
      {/* Центральная область выбора - убрана для лучшей видимости */}

      {/* Градиенты для краев */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-20" />

      <div
        ref={containerRef}
        className="h-full flex flex-col items-center justify-start pt-[200px] select-none relative z-10"
      >
        {infiniteOptions.map((option, index) => {
          const offset = index - currentIndex
          const absOffset = Math.abs(offset)
          // Показываем все элементы в пределах разумного расстояния
          const isVisible = absOffset <= centerIndex

          if (!isVisible) return null


          // Физика масштабирования и прозрачности
          const translateY = offset * itemHeight
          
          // Простая логика определения центрального элемента
          const isCenter = absOffset <= 0.5
          const scale = isCenter ? 1.1 : Math.max(0.5, 1 - absOffset * 0.25)
          const opacity = isCenter ? 1 : Math.max(0.2, 1 - absOffset * 0.4)
          

          return (
            <motion.div
              key={`${option.id}-${index}`}
              onClick={() => handleItemClick(index)}
              data-item={index}
              className="absolute flex items-center justify-center"
              style={{
                height: `${itemHeight}px`,
                top: `calc(50% + ${translateY}px)`,
                transform: `translateY(-50%) scale(${scale})`,
                opacity: opacity,
                pointerEvents: "auto",
                cursor: "pointer",
              }}
              animate={{
                scale: scale,
                opacity: opacity,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              }}
            >
              <span
                className={`font-medium transition-colors duration-200 ${
                  isCenter 
                    ? "text-foreground font-bold text-xl" 
                    : "text-muted-foreground text-base"
                }`}
              >
                {option.label}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
