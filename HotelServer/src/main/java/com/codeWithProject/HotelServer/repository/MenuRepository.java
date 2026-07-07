package com.codeWithProject.HotelServer.repository;

import com.codeWithProject.HotelServer.entity.MenuItem;
import com.codeWithProject.HotelServer.enums.MenuCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuRepository extends JpaRepository<MenuItem, Long> {

    List<MenuItem> findByCategory(MenuCategory category);

    boolean existsByNameIgnoreCase(String name);
}
